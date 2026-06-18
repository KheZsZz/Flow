import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabaseAdmin } from "@/config/supabase";

class AlertsController {
  // GET /alerts/documents?days=30
  async documents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const days = Math.max(0, Math.min(365, Number(req.query.days) || 30));

      const { data, error } = await supabaseAdmin
        .from("document_alerts")
        .select("*")
        .eq("corporation_id", req.company.id)
        .lte("days_remaining", days)
        .order("days_remaining", { ascending: true });

      if (error) throw error;

      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  }
}

export const alertsController = new AlertsController();
