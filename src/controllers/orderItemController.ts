import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";

class OrderItemsController {
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;
      const { status_id, location_item } = req.body;

      if (!status_id) {
        return res.status(400).json({ error: "status_id is required" });
      }

      const { data: item, error: findError } = await supabaseAdmin
        .from("orderitem")
        .select("id, company_id")
        .eq("id", id)
        .eq("company_id", req.company.id)
        .single();

      if (findError || !item) {
        return res.status(404).json({ error: "Order item not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("orderitem")
        .update({
          status_id,
        })
        .eq("id", id)
        .eq("company_id", req.company.id)
        .select(
          `
          id,
          type_orders,
          tracking,
          status!status_id ( id, code, name )
        `,
        )
        .single();

      if (error) throw error;

      if (location_item) {
        await supabaseAdmin
          .from("trackingevents")
          .update({ location_item })
          .eq("order_item_id", id)
          .eq("status_id", status_id)
          .order("created_at", { ascending: false })
          .limit(1);
      }

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

      const { data: link, error: findError } = await supabaseAdmin
        .from("order_add_itens")
        .select(
          `
          order_id,
          orders!order_id ( status!status_id ( code ) )
        `,
        )
        .eq("order_item_id", id)
        .single();

      if (findError || !link) {
        return res.status(404).json({ error: "Order item not found" });
      }

      const statusCode = (link as any).orders?.status?.code;

      if (statusCode !== 100) {
        return res.status(409).json({
          error: "Itens só podem ser removidos de ordens em aberto",
          current_status_code: statusCode,
        });
      }

      const { error } = await supabaseAdmin
        .from("orderitem")
        .delete()
        .eq("id", id)
        .eq("company_id", req.company.id);

      if (error) throw error;

      return res
        .status(200)
        .json({ message: "Order item deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export const orderItemsController = new OrderItemsController();
