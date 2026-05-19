import { Request, Response, NextFunction } from "Express";
import { AuthRequest } from "@/middleware/auth";
import { supabase } from "@/config/supabase";
import { vehicleSchema, vehicleOwnerSchema, VehicleType } from "@/schemas/vehicleSchema";

class VehicleController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const { make, model, year, type, license_plate, is_active } = vehicleSchema.parse(req.body);

    if (!req.company?.id || !req.user?.id) {
      return res
        .status(400)
        .json({ error: "Missing company or user context in request" });
    }

    try {
      const { data: newVehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .insert({
          make,
          model,
          year,
          type,
          license_plate,
          is_active,
          created_by: req.user?.id,
        })
        .select("id")
        .single();

      if (vehicleError) throw vehicleError;

      const vehicleId = newVehicle.id;
      const { error: ownerError } = await supabase
        .from("VehicleOwners")
        .insert({
          corporation_id: req.company?.id,
          vehicle_id: vehicleId,
          created_by: req.user?.id,
        });

      if (ownerError) {
        await supabase.from("vehicles").delete().eq("id", vehicleId);
        throw ownerError;
      }

      return res.status(201).json({
        message: "Vehicle created and linked to corporation successfully",
        vehicleId,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        make,
        model,
        year,
        type,
        license_plate,
        is_active,
      }: VehicleType = vehicleSchema.parse(req.body);

      const { data: updatedVehicle, error: updateError } = await supabase
        .from("vehicles")
        .update({
          make,
          model,
          year,
          type,
          license_plate,
          is_active,
        })
        .eq("id", id)
        .select("id")
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        message: "Vehicle updated successfully",
        vehicleId: updatedVehicle.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data: deletedVehicle, error: deleteError } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", id)
        .select("id")
        .single();

      if (deleteError) throw deleteError;

      return res.status(200).json({
        message: "Vehicle deleted successfully",
        vehicleId: deletedVehicle.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.company?.id;

      if (!companyId) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data: ownersData, error: findError } = await supabase
        .from("VehicleOwners")
        .select(
          `
          corporation_id,
          vehicles!vehicle_id (
            id,
            license_plate,
            type,
            model,
            make,
            year,
            is_active
          )
        `,
        )
        .eq("corporation_id", companyId);

      if (findError) throw findError;

      const vehicles = ownersData
        .map((item) => item.vehicles)
        .filter((vehicle) => vehicle !== null);

      return res.status(200).json(vehicles);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const companyId = req.company?.id;

      if (!companyId) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data: ownersData, error: findError } = await supabase
        .from("VehicleOwners")
        .select(
          `
          corporation_id,
          vehicles!vehicle_id (
            id,
            license_plate,
            type,
            model,
            make,
            year,
            is_active
          )
        `,
        )
        .eq("corporation_id", companyId)
        .eq("vehicles.id", id);

      if (findError) throw findError;

      const vehicle = ownersData
        .map((item) => item.vehicles)
        .filter((vehicle) => vehicle !== null)[0];

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
