import { Request, Response, NextFunction } from "Express";
import { supabase } from "@/config/supabase";
import { AddressTypes } from "@/schemas/address";

class AdrresController {
  async create(req: Request, res: Response, next: NextFunction) {
    const { street, city, state, zipCode }: AddressTypes = req.body;
    try {
      const { data, error } = await supabase
        .from("address")
        .insert({ street, city, state, zipCode });
      if (error) throw error;
      res.status(201).json({ message: "Address created successfully", data });
    } catch (error) {
      next(error);
    }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { street, city, state, zip_code }: AddressTypes = req.body;
    try {
      const { data, error } = await supabase
        .from("address")
        .update({ street, city, state, zip_code })
        .eq("id", id);
      if (error) throw error;
      res.status(200).json({ message: "Address updated successfully", data });
    } catch (error) {
      next(error);
    }
  }
  async delete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("address")
        .delete()
        .eq("id", id);
      if (error) throw error;
      res.status(200).json({ message: "Address deleted successfully", data });
    } catch (error) {
      next(error);
    }
  }
  async find(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("address")
        .select("*")
        .eq("id", id);
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const addressController = new AddressController();
