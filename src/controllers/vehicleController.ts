import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabase, supabaseAdmin } from "@/config/supabase";
import { vehicleSchema, VehicleType } from "@/schemas/vehicleSchema";

class VehicleController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const vehicle = vehicleSchema.parse({
        ...req.body,
        created_by: req.user?.id,
      });

      if (!req.company?.id || !req.user?.id) {
        return res
          .status(403)
          .json({ error: "Company context not found in request" });
      }

      const { data: newVehicle, error: vehicleError } = await supabaseAdmin
        .from("vehicles")
        .insert(vehicle)
        .select("id")
        .single();

      if (vehicleError) throw vehicleError;

      const { error: ownerError } = await supabaseAdmin
        .from("vehicleowners")
        .insert({
          corporation_id: req.company.id,
          vehicle_id: newVehicle.id,
          created_by: req.user.id,
        });

      if (ownerError) {
        await supabaseAdmin.from("vehicles").delete().eq("id", newVehicle.id);
        throw ownerError;
      }

      return res.status(201).json({
        message: "Vehicle created successfully",
        data: { id: newVehicle.id },
      });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res
          .status(403)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabaseAdmin
        .from("vehicleowners")
        .select(
          `
          vehicles!vehicle_id (
            id,
            make,
            model,
            year,
            type,
            license_plate,
            is_active
          )
        `,
        )
        .eq("corporation_id", req.company.id);

      if (error) throw error;

      const vehicles = data
        .map((row) => (row as any).vehicles)
        .filter((v) => v !== null);

      return res.status(200).json(vehicles);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const { data: vehicle, error } = await supabaseAdmin
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .single();

      if (error) {
        console.error("Erro na busca:", error);
        throw error;
      }

      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }

      return res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!req.company?.id) {
        return res
          .status(403)
          .json({ error: "Company context not found in request" });
      }
      const { data: owner, error: ownerError } = await supabaseAdmin
        .from("vehicleowners")
        .select("vehicle_id")
        .eq("vehicle_id", id)
        .eq("corporation_id", req.company.id)
        .single();

      if (ownerError || !owner) {
        return res
          .status(403)
          .json({ error: "Vehicle does not belong to your corporation" });
      }
      const vehicle = vehicleSchema.parse({ ...req.body, id });

      const { data, error } = await supabaseAdmin
        .from("vehicles")
        .update(vehicle)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res
        .status(200)
        .json({ message: "Vehicle updated successfully", data });
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!req.company?.id) {
        return res
          .status(403)
          .json({ error: "Company context not found in request" });
      }

      const { data: owner, error: ownerError } = await supabaseAdmin
        .from("vehicleowners")
        .select("vehicle_id")
        .eq("vehicle_id", id)
        .eq("corporation_id", req.company.id)
        .single();

      if (ownerError || !owner) {
        return res
          .status(403)
          .json({ error: "Vehicle does not belong to your corporation" });
      }

      const { data, error } = await supabaseAdmin
        .from("vehicles")
        .update({ is_active: false })
        .eq("id", id)
        .select("id, license_plate, is_active")
        .single();

      if (error) throw error;

      return res
        .status(200)
        .json({ message: "Vehicle disabled successfully", data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!req.company?.id) {
        return res
          .status(403)
          .json({ error: "Company context not found in request" });
      }

      const { data: owner, error: ownerError } = await supabaseAdmin
        .from("vehicleowners")
        .select("vehicle_id")
        .eq("vehicle_id", id)
        .eq("corporation_id", req.company.id)
        .single();

      if (ownerError || !owner) {
        return res
          .status(403)
          .json({ error: "Vehicle does not belong to your corporation" });
      }

      const { error } = await supabaseAdmin
        .from("vehicles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async findByPlate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { plate } = req.params;

      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("vehicles")
        .select(
          `
          id, make, model, year, type, license_plate, is_active,
          vehicleowners!inner(corporation_id)
        `,
        )
        .eq("license_plate", plate)
        .eq("vehicleowners.corporation_id", req.company.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res
            .status(404)
            .json({ error: "Vehicle not found or not authorized" });
        }
        throw error;
      }

      const { vehicleowners, ...vehicle } = data as any;

      return res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }

  async updateActiveStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from("vehicles")
        .update({ is_active })
        .eq("id", id)
        .select("*")
        .single();

      if (vehicleError) {
        console.error("Erro Supabase:", vehicleError);
        return res.status(400).json({ error: vehicleError.message });
      }

      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }

      return res.status(200).json(vehicle);
    } catch (error) {
      next(error);
    }
  }
}
export const vehicleController = new VehicleController();
