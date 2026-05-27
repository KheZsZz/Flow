import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "@/config/supabase";
import { FuelSchema, VehicleOwnerType } from "@/schemas/vehicleSchema";
import { AuthRequest } from "@/middleware/auth";

class FuelController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const fuelData = FuelSchema.parse({
        ...req.body,
        corporation_id: req.company?.id,
      });

      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }

      const { data, error } = await supabaseAdmin
        .from("fuel")
        .insert([{ ...fuelData }])
        .select()
        .single();

      if (error) throw next(error);

      res
        .status(201)
        .json({ message: "Fuel record created successfully", data: data });
    } catch (error) {
      next(error);
    }
  }
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const fuelData = FuelSchema.parse({
        ...req.body,
        corporation_id: req.company?.id,
      });

      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }

      const { data, error } = await supabaseAdmin
        .from("fuel")
        .update([{ ...fuelData }])
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw next(error);

      res
        .status(200)
        .json({ message: "Fuel record updated successfully", data: data });
    } catch (error) {
      next(error);
    }
  }
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("fuel")
        .delete()
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw next(error);

      res
        .status(200)
        .json({ message: "Fuel record deleted successfully", data: data });
    } catch (error) {
      next(error);
    }
  }

  async find(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }

      const { data: owners, error: ownersError } = await supabaseAdmin
        .from("vehicleowners")
        .select("vehicle_id")
        .eq("corporation_id", req.company.id);

      if (ownersError) throw ownersError;

      const vehicleIds = owners.map(
        (vehicle: VehicleOwnerType) => vehicle.vehicle_id,
      );

      if (vehicleIds.length === 0) {
        return res.status(200).json({ message: "No vehicles found", data: [] });
      }

      const { data, error } = await supabaseAdmin
        .from("fuel")
        .select(
          `
          id,
          liters,
          current_odometer,
          total_price,
          created_at,
          vehicles!vehicle_id (
            id,
            license_plate,
            make,
            model
          )
        `,
        )
        .in("vehicle_id", vehicleIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({ message: "Fuel records found", data });
    } catch (error) {
      next(error);
    }
  }
  async findByPlate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company is required" });
      }

      const { plate } = req.params;

      const { data: owner, error: ownerError } = await supabaseAdmin
        .from("vehicleowners")
        .select(
          "vehicle_id, vehicles!vehicle_id (id, license_plate, make, model)",
        )
        .eq("corporation_id", req.company.id)
        .eq("vehicles.license_plate", plate)
        .single();

      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from("vehicles")
        .select("id, license_plate, make, model")
        .eq("license_plate", plate)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }

      const { data: ownerCheck, error: ownerCheckError } = await supabaseAdmin
        .from("vehicleowners")
        .select("vehicle_id")
        .eq("vehicle_id", vehicle.id)
        .eq("corporation_id", req.company.id)
        .single();

      if (ownerCheckError || !ownerCheck) {
        return res
          .status(403)
          .json({ error: "Vehicle does not belong to your corporation" });
      }

      const { data, error } = await supabaseAdmin
        .from("fuel")
        .select("id, liters, current_odometer, total_price, created_at")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        message: "Fuel records found",
        vehicle,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const fuelController = new FuelController();
