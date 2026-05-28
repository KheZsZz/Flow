import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { orderReceiptSchema } from "@/schemas/ordersSchema";


class OrderReceiptsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { order_item_id, url } = orderReceiptSchema.parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("orderreceipts")
        .insert({
          company_id: req.company.id,
          order_item_id,
          url,
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

  async findByItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { item_id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("orderreceipts")
        .select("id, url, created_at")
        .eq("order_item_id", item_id)
        .eq("company_id", req.company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}
export const orderReceiptsController = new OrderReceiptsController();