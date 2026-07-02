import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { maintenanceSchema } from "@/schemas/maintenanceSchema";

class MaintenanceController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const data = maintenanceSchema.parse(req.body);

      const { data: created, error } = await supabaseAdmin
        .from("maintenances")
        .insert({
          ...data,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select("*, vehicles(license_plate, make, model)")
        .single();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Manutenção registrada", data: created });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("maintenances")
        .select("*, vehicles(license_plate, make, model)")
        .eq("corporation_id", req.company.id)
        .eq("is_active", true)
        .order("performed_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = maintenanceSchema.partial().parse(req.body);

      const { data: updated, error } = await supabaseAdmin
        .from("maintenances")
        .update(data)
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Manutenção atualizada", data: updated });
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("maintenances")
        .update({ is_active: false })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ message: "Manutenção removida", data });
    } catch (error) {
      next(error);
    }
  }
}

export const maintenanceController = new MaintenanceController();
