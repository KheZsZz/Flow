import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import {
  maintenanceSchema,
  maintenanceTypeSchema,
} from "@/schemas/maintenanceSchema";

const MAINTENANCE_SELECT =
  "*, vehicles(license_plate, make, model), maintenance_types(id, name, category)";

class MaintenanceController {
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const data = maintenanceSchema.parse(req.body);

      // Denormaliza o nome do tipo pra manter a coluna text sincronizada
      let typeName: string | null = data.maintenance_type ?? null;
      if (!typeName && data.maintenance_type_id) {
        const { data: mt } = await supabaseAdmin
          .from("maintenance_types")
          .select("name")
          .eq("id", data.maintenance_type_id)
          .eq("corporation_id", req.company.id)
          .single();
        typeName = mt?.name ?? null;
      }

      const { data: created, error } = await supabaseAdmin
        .from("maintenances")
        .insert({
          vehicle_id: data.vehicle_id,
          maintenance_type_id: data.maintenance_type_id,
          maintenance_type: typeName,
          description: data.description ?? null,
          cost: data.cost,
          odometer: data.odometer ?? null,
          performed_at: data.performed_at,
          next_due_at: data.next_due_at ?? null,
          receipt_url: data.receipt_url ?? null,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select(MAINTENANCE_SELECT)
        .single();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Manutenção registrada", data: created });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("maintenances")
        .select(MAINTENANCE_SELECT)
        .eq("corporation_id", req.company.id)
        .eq("is_active", true)
        .order("performed_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = maintenanceSchema.partial().parse(req.body);

      let typeName = data.maintenance_type;
      if (data.maintenance_type_id && !typeName) {
        const { data: mt } = await supabaseAdmin
          .from("maintenance_types")
          .select("name")
          .eq("id", data.maintenance_type_id)
          .eq("corporation_id", req.company?.id)
          .single();
        typeName = mt?.name ?? undefined;
      }

      const { data: updated, error } = await supabaseAdmin
        .from("maintenances")
        .update({ ...data, maintenance_type: typeName })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select(MAINTENANCE_SELECT)
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Manutenção atualizada", data: updated });
    } catch (error) {
      next(error);
    }
  };

  disable = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
  };
}

class MaintenanceTypesController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const { category } = req.query;

      let q = supabaseAdmin
        .from("maintenance_types")
        .select("*")
        .eq("corporation_id", req.company.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (category) q = q.eq("category", String(category));

      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const payload = maintenanceTypeSchema.parse(req.body);
      const { data, error } = await supabaseAdmin
        .from("maintenance_types")
        .insert({
          ...payload,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Tipo de manutenção criado", data });
    } catch (error) {
      next(error);
    }
  };

  disable = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("maintenance_types")
        .update({ is_active: false })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Tipo de manutenção desativado", data });
    } catch (error) {
      next(error);
    }
  };
}

export const maintenanceController = new MaintenanceController();
export const maintenanceTypesController = new MaintenanceTypesController();
