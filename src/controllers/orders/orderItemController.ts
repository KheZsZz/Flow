import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { orderItemSchema } from "@/schemas/ordersSchema";

class OrderItemsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
      }

      const { invoice_id, type_orders, tracking, status_id } =
        orderItemSchema.parse(req.body);

      // 1. Cria o item
      const { data: item, error: itemError } = await supabaseAdmin
        .from("orderitem")
        .insert({
          company_id: req.company.id,
          invoice_id,
          type_orders,
          tracking,
          status_id,
          created_by: req.user.id,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // 2. Vincula ao pedido
      const { error: linkError } = await supabaseAdmin
        .from("order_add_itens")
        .insert({
          order_id,
          order_item_id: item.id,
        });

      if (linkError) {
        await supabaseAdmin.from("orderitem").delete().eq("id", item.id);
        throw linkError;
      }

      return res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }

  async findByOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { order_id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("order_add_itens")
        .select(`
          orderitem!order_item_id (
            id, type_orders, tracking, created_at,
            status!status_id ( id, code, name ),
            invoices!invoice_id (
              id, nfe, value_nfe,
              clients!client_id ( id, name_client )
            ),
            orderreceipts ( id, url ),
            trackingevents (
              id, location_item, description_item, created_at,
              status!status_id ( id, code, name )
            )
          )
        `)
        .eq("order_id", order_id);

      if (error) throw error;

      const items = data.map((row: any) => row.orderitem).filter(Boolean);
      return res.status(200).json(items);
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
        .from("orderitem")
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
        .from("orderitem")
        .delete()
        .eq("id", id)
        .eq("company_id", req.company.id);

      if (error) throw error;
      return res.status(200).json({ message: "Order item deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export const orderItemsController = new OrderItemsController();