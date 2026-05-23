import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "@/config/supabase";
import { AddressSchema, AddressTypes } from "@/schemas/addressSchema";
import { AuthRequest } from "@/middleware/auth";

class AddressController {
  async create(req: Request, res: Response, next: NextFunction) {
    const { street, city, state, zip_code }: AddressTypes = AddressSchema.parse(req.body);
    
    try {
      const { data, error } = await supabase
        .from("address")
        .insert({ street, city, state, zip_code });
      if (error) throw error;
      res.status(201).json({ message: "Address created successfully", data });
    } catch (error) {
      next(error);
    }
  }
  
  async update(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { street, city, state, zip_code }: AddressTypes = AddressSchema.parse(req.body);
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

  async findById(req: Request, res: Response, next: NextFunction) { 
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

  async findByCep(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const { cep } = req.params;

        if (!req.company?.id) {
          return res.status(403).json({ error: "Company context not found in request" });
        }

        const { data, error } = await supabaseAdmin
          .from("addresses")
          .select(`
            id,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            country,
            cep
          `)
          .eq("corporation_id", req.company.id)
          .eq("cep", cep)
          .single();

        if (error) throw error;

        if (!data) {
          return res.status(404).json({ error: "Address not found in your corporation" });
        }

        return res.status(200).json(data);
      } catch (error) {
        next(error);
      }
  }
  
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabase
        .from("address")
        .select("*");
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  } 
}

export const addressController = new AddressController();
