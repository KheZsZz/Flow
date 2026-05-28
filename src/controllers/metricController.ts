import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";

class MetricController {

  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ error: "Company context not found in request" });
      }

      const { start_date, end_date } = req.query;

      const { data, error } = await supabaseAdmin.rpc("get_fuel_summary", {
        p_corporation_id: req.company.id,
        start_date: start_date ? String(start_date) : undefined,
        end_date:   end_date   ? String(end_date)   : undefined,
      });

      if (error) throw error;

      return res.status(200).json(data?.[0] ?? {
        total_spent: 0,
        total_liters: 0,
        avg_price_per_liter: 0,
      });
    } catch (error) {
      next(error);
    }
  }

  async getVehicleEfficiency(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabaseAdmin.rpc("get_vehicle_efficiency", {
        p_corporation_id: req.company.id,
      });

      if (error) throw error;

      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  }

  async getDriverRanking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ error: "Company context not found in request" });
      }

      const limit = Number(req.query.limit) || 10;

      const { data, error } = await supabaseAdmin.rpc("get_driver_ranking", {
        p_corporation_id: req.company.id,
        limit_rows: limit,
      });

      if (error) throw error;

      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  }
}

export const metricController = new MetricController();