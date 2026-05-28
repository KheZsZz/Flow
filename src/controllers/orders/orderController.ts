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

      const { status_id } = orderSchema.parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("orders")
        .insert({
          company_id: req.company.id,
          status_id,
          created_by: req.user.id,
        })
        .select()
        .single();

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
        .select(`
          id, created_at, updated_at,
          status!status_id ( id, code, name, description ),
          order_add_itens (
            order_item_id,
            orderitem!order_item_id (
              id, type_orders, tracking,
              status!status_id ( id, code, name ),
              invoices!invoice_id ( id, nfe, value_nfe,
                clients!client_id ( id, name_client )
              )
            )
          )
        `)
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
        .select(`
          id, created_at, updated_at,
          status!status_id ( id, code, name, description ),
          order_add_itens (
            order_item_id,
            orderitem!order_item_id (
              id, type_orders, tracking,
              status!status_id ( id, code, name ),
              invoices!invoice_id ( id, nfe, value_nfe,
                clients!client_id ( id, name_client )
              ),
              orderreceipts ( id, url, created_at ),
              trackingevents (
                id, location_item, description_item, created_at,
                status!status_id ( id, code, name )
              )
            )
          )
        `)
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
      const { status_id } = req.body;

      if (!status_id) {
        return res.status(400).json({ error: "status_id is required" });
      }

      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ status_id })
        .eq("id", id)
        .eq("company_id", req.company.id)
        .select()
        .single();

      if (error) throw error;
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

export const ordersController     = new OrdersController();