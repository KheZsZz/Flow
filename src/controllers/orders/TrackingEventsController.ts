import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";


class TrackingEventsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { order_item_id, location_item, description_item, status_id } =
        req.body;

      if (!order_item_id || !status_id) {
        return res.status(400).json({ error: "order_item_id and status_id are required" });
      }

      const { data, error } = await supabaseAdmin
        .from("trackingevents")
        .insert({
          order_item_id,
          location_item,
          description_item,
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

  async findByItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { item_id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("trackingevents")
        .select(`
          id, location_item, description_item, created_at,
          status!status_id ( id, code, name, description )
        `)
        .eq("order_item_id", item_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const trackingEventsController = new TrackingEventsController();