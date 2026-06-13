import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { orderSchema, updateOrderSchema } from "@/schemas/ordersSchema";

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
              invoice_id: it.invoice_id,
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

      // atualiza um a um para disparar o trigger de finalização
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
          type_orders,
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
          type_orders,
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
                clients!mailer_id  ( id, name_client, document ),
                clients!recever_id ( id, name_client, document )
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
}

export const ordersController = new OrdersController();
