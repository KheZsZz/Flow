import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { clientSchema } from "@/schemas/clientsSchema";
import { AddressTypes } from "@/schemas/addressSchema";

class ClientsController {
  private createdAddress = async (
    address: AddressTypes,
  ): Promise<AddressTypes | null> => {
    const { data, error } = await supabaseAdmin.from("addresses").insert({
      street: address?.street || "",
      neighborhood: address?.neighborhood || "",
      city: address?.city || "",
      state: address?.state || "",
      zip_code: address?.zip_code || "",
      number: address?.number || "S/N",
      complement: address?.complement || "",
    });

    if (error) throw error;

    return data;
  };
  private updateAddress = async (
    address: AddressTypes,
  ): Promise<AddressTypes | null> => {
    if (!address) return null;

    const { data, error } = await supabaseAdmin
      .from("addresses")
      .update({
        street: address?.street || "",
        neighborhood: address?.neighborhood || "",
        city: address?.city || "",
        state: address?.state || "",
        zip_code: address?.zip_code || "",
        number: address?.number || "S/N",
        complement: address?.complement || "",
      })
      .eq("id", address.id);

    if (error) throw error;

    return data;
  };

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { data, error } = await supabaseAdmin
        .from("clients")
        .select(
          `
          id,
          document,
          name_client,
          email,
          phone,
          is_active,
          address!address_id(*)
        `,
        )
        .eq("corporation_id", req.company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async findByDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { document } = req.params;
      if (!document) {
        return res.status(400).json({ error: "Document is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("clients")
        .select(
          `
          id,
          document,
          name_client,
          email,
          phone,
          is_active,
          address!address_id(*)
        `,
        )
        .eq("corporation_id", req.company?.id)
        .eq("document", document)
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Id is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("clients")
        .select(
          `
          id,
          document,
          name_client,
          email,
          phone,
          is_active,
          address!address_id(*)
        `,
        )
        .eq("corporation_id", req.company?.id)
        .eq("id", id)
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const client = clientSchema.parse(req.body);

      const address = await this.createdAddress(client.address);

      const { data, error } = await supabaseAdmin
        .from("clients")
        .insert({
          corporation_id: req.company?.id,
          document: client.document,
          name_client: client.name_client,
          email: client.email,
          phone: client.phone,
          is_active: client.is_active,
          address_id: address?.id,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Id is required" });
      }
      const client = clientSchema.parse(req.body);

      const address = await this.updateAddress(client.address);

      const { data, error } = await supabaseAdmin
        .from("clients")
        .update({
          document: client.document,
          name_client: client.name_client,
          email: client.email,
          phone: client.phone,
          is_active: client.is_active,
          address_id: address?.id,
        })
        .eq("corporation_id", req.company?.id)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Id is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("clients")
        .update({ is_active: false })
        .eq("corporation_id", req.company?.id)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const clientsController = new ClientsController();
