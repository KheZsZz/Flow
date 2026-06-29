import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";

class TrackingEventsController {
  async findByItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { item_id } = req.params;

      // valida que o item pertence à empresa
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("orderitem")
        .select("id, company_id")
        .eq("id", item_id)
        .eq("company_id", req.company.id)
        .single();
      if (itemErr || !item) {
        return res.status(404).json({ error: "Order item not found" });
      }

      // número único de rastreio = VG da viagem (reaproveitado)
      const { data: link } = await supabaseAdmin
        .from("order_add_itens")
        .select(`orders!order_id ( tracking )`)
        .eq("order_item_id", item_id)
        .single();

      const { data: events, error } = await supabaseAdmin
        .from("trackingevents")
        .select(
          `
          id,
          location_item,
          description_item,
          created_at,
          status!status_id ( id, code, name )
        `,
        )
        .eq("order_item_id", item_id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      return res.status(200).json({
        tracking: (link as any)?.orders?.tracking ?? null,
        events: events ?? [],
      });
    } catch (error) {
      next(error);
    }
  }
}

export const trackingEventsController = new TrackingEventsController();
