import { Request, Response, NextFunction } from "express";
import { supabase } from "@/config/supabase";
import { CoporateSchema, coporateType } from "@/schemas/corporateSchema";
import { AuthRequest } from "@/middleware/auth";

// Endereço no cadastro ainda não integrado.
class CorporateController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const { name, cnpj, phone, logo_url, manager_id }: coporateType = CoporateSchema.parse(req.body);

    const { data, error } = await supabase
      .from("corporation")
      .insert({
        name,
        cnpj,
        phone,
        logo_url,
        manager_id,
        created_by: req.user?.id,
      })
      .select();

    if (error) throw error;
    res.status(201).json({ message: "Corporate created successfully", data });
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    const { name, cnpj, phone, logo_url }: coporateType = CoporateSchema.parse(req.body);
    const { data, error } = await supabase
      .from("corporation")
      .update({
        name,
        cnpj,
        phone,
        logo_url,
      })
      .eq("id", req.params.id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: "Corporate updated successfully", data });
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    const { data, error } = await supabase
      .from("corporation")
      .select("*")
      .eq("id", req.company?.id)
      .single();

    if (error) throw error;
    res.status(200).json({ message: "Corporate retrieved successfully", data });
  }
}

export const corporateController = new CorporateController();
