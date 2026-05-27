import { Request, Response, NextFunction } from "express";
import { supabase, supabaseAdmin } from "@/config/supabase";
import { AddressSchema, AddressTypes } from "@/schemas/addressSchema";
import { AuthRequest } from "@/middleware/auth";
import { fetchViaCep } from "@/utils/viaCep";

class AddressController {
  async create(req: Request, res: Response, next: NextFunction) {
    const { street, city, state, zip_code }: AddressTypes = AddressSchema.parse(
      req.body,
    );

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
    const { street, city, state, zip_code }: AddressTypes = AddressSchema.parse(
      req.body,
    );
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
  async findByCep(req: Request, res: Response, next: NextFunction) {
    try {
      const cep = String(req.params.cep);

      const { data, error } = await supabaseAdmin
        .from("address")
        .select("id, street, neighborhood, city, state, zip_code")
        .eq("zip_code", cep);

      if (error) throw error;

      if (data && data.length > 0) {
        return res.status(200).json(data[0]);
      }

      const addressData = await fetchViaCep(cep);

      const { data: newAddress, error: insertError } = await supabaseAdmin
        .from("address")
        .insert(addressData)
        .select("id, street, neighborhood, city, state, zip_code")
        .single();

      if (insertError) throw insertError;

      return res.status(201).json(newAddress);
    } catch (error) {
      next(error);
    }
  }
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabase.from("address").select("*");
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const addressController = new AddressController();
