import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import {
  orderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from "@/schemas/ordersSchema";

class OrdersController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const body = orderSchema.parse(req.body);

      const { data, error } = await supabaseAdmin.rpc("create_order", {
        p_corporation_id: req.company.id,
        p_created_by: req.user.id,
        p_status_id: body.status_id,
        p_driver_id: body.driver_id,
        p_delivery_date: body.delivery_date,
        p_scheduled_start: body.scheduled_start ?? null,
        p_notes: body.notes ?? null,
        p_vehicles: body.vehicles,
        p_items: body.items ?? [],
      });

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;
      const body = updateOrderSchema.parse(req.body);

      const { data: order, error: findError } = await supabaseAdmin
        .from("orders")
        .select(`id, finaled_at, status!status_id ( code )`)
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();

      if (findError || !order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const statusCode = (order as any).status?.code as number;
      const finalized = !!(order as any).finaled_at || statusCode === 102;
      if (finalized) {
        return res
          .status(409)
          .json({ error: "Viagem finalizada não pode ser alterada" });
      }

      const started = statusCode !== 100;
      const wantsDriverOrVehicleChange =
        body.driver_id !== undefined || body.vehicles !== undefined;

      if (started && wantsDriverOrVehicleChange) {
        return res.status(409).json({
          error:
            "Viagem iniciada: motorista e veículos não podem ser alterados",
          current_status_code: statusCode,
        });
      }

      const orderPatch: Record<string, any> = { updated_at: new Date() };
      if (body.notes !== undefined) orderPatch.notes = body.notes;
      if (body.delivery_date !== undefined)
        orderPatch.delivery_date = body.delivery_date;
      if (body.scheduled_start !== undefined)
        orderPatch.scheduled_start = body.scheduled_start;
      if (!started && body.driver_id !== undefined)
        orderPatch.driver_id = body.driver_id;

      const { error: updErr } = await supabaseAdmin
        .from("orders")
        .update(orderPatch)
        .eq("id", id)
        .eq("company_id", req.company.id);
      if (updErr) throw updErr;

      if (!started && body.vehicles !== undefined) {
        await supabaseAdmin.from("ordervehicles").delete().eq("order_id", id);
        if (body.vehicles.length > 0) {
          const rows = body.vehicles.map((v, i) => ({
            order_id: id,
            vehicle_id: v.vehicle_id,
            role: v.role ?? "Cavalo",
            position: v.position ?? i + 1,
          }));
          const { error: vErr } = await supabaseAdmin
            .from("ordervehicles")
            .insert(rows);
          if (vErr) throw vErr;
        }
      }

      // 3. remover itens (trigger barra itens concluídos)
      if (body.remove_item_ids?.length) {
        const { error: delErr } = await supabaseAdmin
          .from("orderitem")
          .delete()
          .in("id", body.remove_item_ids)
          .eq("company_id", req.company.id);
        if (delErr) {
          return res.status(409).json({ error: delErr.message });
        }
      }

      // 4. adicionar itens/notas
      if (body.add_items?.length) {
        for (const it of body.add_items) {
          const { data: newItem, error: itErr } = await supabaseAdmin
            .from("orderitem")
            .insert({
              company_id: req.company.id,
              invoice_id: it.invoice_id ?? null,
              collection_id: it.collection_id ?? null, // ← faltando
              type_orders: it.type_orders,
              tracking: it.tracking ?? null,
              status_id: it.status_id,
              created_by: req.user.id,
            })
            .select("id")
            .single();
          if (itErr) throw itErr;

          const { error: linkErr } = await supabaseAdmin
            .from("order_add_itens")
            .insert({ order_id: id, order_item_id: newItem.id });
          if (linkErr) throw linkErr;
        }
      }

      return res.status(200).json({ message: "Viagem atualizada com sucesso" });
    } catch (error) {
      next(error);
    }
  }
  async baixar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;
      const itemIds: string[] = req.body?.item_ids ?? [];
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ error: "item_ids é obrigatório" });
      }

      const { data: order, error: findError } = await supabaseAdmin
        .from("orders")
        .select(`id, finaled_at`)
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();

      if (findError || !order) {
        return res.status(404).json({ error: "Order not found" });
      }
      if ((order as any).finaled_at) {
        return res.status(409).json({ error: "Viagem já finalizada" });
      }

      const { data: statusDone, error: statusErrEmp } = await supabaseAdmin
        .from("status")
        .select("id")
        .eq("corporation_id", req.company.id)
        .eq("code", 102)
        .single();
      if (statusErrEmp || !statusDone) {
        return res
          .status(500)
          .json({ error: "Status 'Concluído' (102) não configurado" });
      }
      const { data: targets, error: targetsErr } = await supabaseAdmin
        .from("orderitem")
        .select(`id, status!status_id ( code )`)
        .in("id", itemIds)
        .eq("company_id", req.company.id);
      if (targetsErr) throw targetsErr;

      const found = targets ?? [];
      const notReady = found.filter((it: any) => it.status?.code !== 200);
      if (found.length !== itemIds.length || notReady.length > 0) {
        return res.status(409).json({
          error:
            "Só é possível baixar itens em 'Aguardando Canhoto' (200). " +
            "Conclua antes as etapas de entrega/coleta.",
          invalid_item_ids: notReady.map((it: any) => it.id),
        });
      }

      for (const itemId of itemIds) {
        const { error: upErr } = await supabaseAdmin
          .from("orderitem")
          .update({ status_id: statusDone.id, updated_at: new Date() })
          .eq("id", itemId)
          .eq("company_id", req.company.id);
        if (upErr) throw upErr;
      }

      const { data: refreshed, error: refErr } = await supabaseAdmin
        .from("orders")
        .select(`id, finaled_at, status!status_id ( id, code, name )`)
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();
      if (refErr) throw refErr;

      return res.status(200).json(refreshed);
    } catch (error) {
      next(error);
    }
  }
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          tracking,
          delivery_date,
          scheduled_start,
          finaled_at,
          notes,
          created_at,
          updated_at,
          status!status_id ( id, code, name ),
          drivers!driver_id (
            users!user_id ( id, name_user )
          ),
          ordervehicles (
            role,
            position,
            vehicles!vehicle_id ( id, license_plate, make, model, type )
          ),
          order_add_itens (
            orderitem!order_item_id (
              id,
              type_orders,
              tracking,
              status!status_id ( id, code, name ),
              invoices!invoice_id (
                id, nfe, value_nfe,
                remetente:clients!mailer_id  ( id, name_client ),
                destinatario:clients!recever_id ( id, name_client )
              ),
              collections!collection_id ( id, code, description )
            )
          )
          `,
        )
        .eq("company_id", req.company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;

      // caralho de SQL do inferno! NUnca Mecher aqui...
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          delivery_date,
          notes,
          created_at,
          updated_at,
          status!status_id ( id, code, name, description ),
          drivers!driver_id (
            id,
            cnh,
            categoria_cnh,
            users!user_id ( id, name_user, phone_user, avatar_url )
          ),
          ordervehicles (
            role,
            position,
            vehicles!vehicle_id ( id, license_plate, make, model, type, year )
          ),
          orderstatushistory (
            id,
            changed_at,
            status!status_id ( id, code, name )
          ),
          order_add_itens (
            orderitem!order_item_id (
              id,
              type_orders,
              tracking,
              created_at,
              status!status_id ( id, code, name, description ),
              invoices!invoice_id (
                id, nfe, serie_nf, value_nfe, weight_brute,
                remetente:clients!mailer_id  ( id, name_client, document ),
                destinatario:clients!recever_id ( id, name_client, document )
              ),
              collections!collection_id ( id, code, description, scheduled_date ),
              orderreceipts ( id, url, created_at ),
              trackingevents (
                id, location_item, description_item, created_at,
                status!status_id ( id, code, name )
              )
            )
          )
        `,
        )
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Order not found" });

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;
      const { status_id } = orderSchema.parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ status_id })
        .eq("id", id)
        .eq("company_id", req.company.id)
        .select(
          `
          id,
          type_orders,
          status!status_id ( id, code, name )
        `,
        )
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Order not found" });

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;

      const { data: order, error: findError } = await supabaseAdmin
        .from("orders")
        .select(
          `
          id,
          status!status_id ( code )
        `,
        )
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();

      if (findError || !order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const statusCode = (order as any).status?.code;

      if (statusCode !== 100) {
        return res.status(409).json({
          error: "Apenas ordens em aberto podem ser excluídas",
          current_status_code: statusCode,
        });
      }

      const { error } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", id)
        .eq("company_id", req.company.id);

      if (error) throw error;

      return res.status(200).json({ message: "Order deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
  async start(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;

      const { data: order, error: findErr } = await supabaseAdmin
        .from("orders")
        .select(`id, finaled_at, status!status_id ( code )`)
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();
      if (findErr || !order)
        return res.status(404).json({ error: "Order not found" });
      if ((order as any).finaled_at)
        return res.status(409).json({ error: "Viagem já finalizada" });
      if ((order as any).status?.code !== 100)
        return res.status(409).json({
          error: "Só é possível iniciar viagens em 'Em aberto' (100).",
        });

      const { data: statuses, error: stErr } = await supabaseAdmin
        .from("status")
        .select("id, code")
        .eq("corporation_id", req.company.id)
        .in("code", [100, 110]);
      if (stErr) throw stErr;
      const s100 = statuses?.find((s: any) => s.code === 100);
      const s110 = statuses?.find((s: any) => s.code === 110);
      if (!s110)
        return res
          .status(500)
          .json({ error: "Status 'Em Rota' (110) não configurado" });

      await supabaseAdmin
        .from("orders")
        .update({ status_id: s110.id, updated_at: new Date() })
        .eq("id", id)
        .eq("company_id", req.company.id);

      await supabaseAdmin
        .from("orderstatushistory")
        .insert({ order_id: id, status_id: s110.id, changed_by: req.user?.id });

      const { data: links } = await supabaseAdmin
        .from("order_add_itens")
        .select("order_item_id")
        .eq("order_id", id);
      const itemIds = (links ?? []).map((l: any) => l.order_item_id);
      if (itemIds.length && s100) {
        await supabaseAdmin
          .from("orderitem")
          .update({ status_id: s110.id, updated_at: new Date() })
          .in("id", itemIds)
          .eq("company_id", req.company.id)
          .eq("status_id", s100.id);
      }

      const { data: refreshed } = await supabaseAdmin
        .from("orders")
        .select(`id, tracking, finaled_at, status!status_id ( id, code, name )`)
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();
      return res.status(200).json(refreshed);
    } catch (error) {
      next(error);
    }
  }
  async concluir(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      const bodyIds: string[] | undefined = req.body?.item_ids;

      const { data: order, error: findErr } = await supabaseAdmin
        .from("orders")
        .select("id, finaled_at")
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();
      if (findErr || !order)
        return res.status(404).json({ error: "Order not found" });
      if ((order as any).finaled_at)
        return res.status(409).json({ error: "Viagem já finalizada" });

      const { data: st, error: stErr } = await supabaseAdmin
        .from("status")
        .select("id, code")
        .eq("corporation_id", req.company.id)
        .in("code", [110, 111, 112, 113, 102]);
      if (stErr) throw stErr;
      const byCode = (c: number) =>
        st?.find((s: any) => s.code === c)?.id as string | undefined;
      const s110 = byCode(110),
        s111 = byCode(111),
        s112 = byCode(112),
        s113 = byCode(113),
        s102 = byCode(102);
      if (!s110 || !s111 || !s112 || !s113 || !s102)
        return res
          .status(500)
          .json({ error: "Status da cadeia de rastreio não configurados" });

      const { data: links } = await supabaseAdmin
        .from("order_add_itens")
        .select("order_item_id")
        .eq("order_id", id);
      let itemIds = (links ?? []).map((l: any) => l.order_item_id);
      if (Array.isArray(bodyIds) && bodyIds.length)
        itemIds = itemIds.filter((x: string) => bodyIds.includes(x));
      if (!itemIds.length)
        return res.status(400).json({ error: "Nenhum item para concluir" });

      const { data: items, error: itErr } = await supabaseAdmin
        .from("orderitem")
        .select("id, invoice_id, collection_id, status!status_id ( code )")
        .in("id", itemIds)
        .eq("company_id", req.company?.id);
      if (itErr) throw itErr;

      const setStatus = async (itemId: string, statusId: string) => {
        const { error } = await supabaseAdmin
          .from("orderitem")
          .update({ status_id: statusId, updated_at: new Date() })
          .eq("id", itemId)
          .eq("company_id", req.company?.id);
        if (error) {
          if ((error as any).code === "P0001")
            throw new Error((error as any).message);
          throw error;
        }
      };

      for (const it of items ?? []) {
        let code = (it as any).status?.code;
        if (code === 102) continue;
        if (code === 100) {
          await setStatus(it.id, s110);
          code = 110;
        }
        if (code === 110) {
          await setStatus(it.id, s111);
          code = 111;
        }
        if (code === 111) {
          await setStatus(it.id, (it as any).invoice_id ? s112 : s113);
          code = 200;
        }
        await setStatus(it.id, s102); // 200 -> 102
      }

      const { data: refreshed } = await supabaseAdmin
        .from("orders")
        .select("id, tracking, finaled_at, status!status_id ( id, code, name )")
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();
      return res.status(200).json(refreshed);
    } catch (error) {
      next(error);
    }
  }
}

export const ordersController = new OrdersController();
