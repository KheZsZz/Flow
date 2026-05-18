import { Request, Response, NextFunction } from "Express";
import { supabase } from "@/congif/supabase";
import { VehicleTypes } from "@/schemas/vehicle";
import { AuthRequest } from "@/types/auth";

export class VehicleController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const { userId, ...vehicleData } = req.body;
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({ ...vehicleData, userId })
        .select();
      if (error) return next(error);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
  async update(req: Request, res: Response, next: NextFunction) {}
  async delete(req: Request, res: Response, next: NextFunction) {}
  async findAll(req: Request, res: Response, next: NextFunction) {}
  async findById(req: Request, res: Response, next: NextFunction) {}
}
