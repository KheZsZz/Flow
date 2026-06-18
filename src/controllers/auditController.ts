import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabaseAdmin } from "@/config/supabase";

class AuditController {
  // GET /audit?entity=&action=&actor_id=&from=&to=&limit=50
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));

      let query = supabaseAdmin
        .from("audit_log")
        .select("*")
        .eq("corporation_id", req.company.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (req.query.entity) query = query.eq("entity", String(req.query.entity));
      if (req.query.action) query = query.eq("action", String(req.query.action));
      if (req.query.actor_id)
        query = query.eq("actor_id", String(req.query.actor_id));
      if (req.query.from)
        query = query.gte("created_at", String(req.query.from));
      if (req.query.to) query = query.lte("created_at", String(req.query.to));

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
