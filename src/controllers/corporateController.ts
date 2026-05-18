import { Request, Response, NextFunction } from "Express";
import { supabase } from "@/config/supabase";
import { corporateType } from "@/schemas/corporateSchema";
import { AuthRequest } from "@/middleware/auth";

// Endereço no cadastro ainda não integrado.
class CorporateController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const { name, cnpj, phone, logo_url, manager_id }: corporateType = req.body;

    const { data, error } = await supabase
      .from("corporates")
      .insert({
        name,
        cnpj,
        phone,
        logo_url,
        manager_id,
        created_by: req.user.id,
      })
      .select();

    if (error) throw error;
    res.status(201).json({ message: "Corporate created successfully", data });
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    const { name, cnpj, phone, logo_url }: corporateType = req.body;
    const { data, error } = await supabase
      .from("corporates")
      .update({
        name,
        cnpj,
        phone,
        logo_url,
      })
      .eq("id")
      .select();

    if (error) throw error;
    res.status(200).json({ message: "Corporate updated successfully", data });
  }
}

export const corporateController = new CorporateController();
