import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { orderSchema } from "@/schemas/ordersSchema";

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
              invoices!invoice_id ( id, nfe, value_nfe ),
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

      // Valida se a ordem existe e pertence à empresa
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
