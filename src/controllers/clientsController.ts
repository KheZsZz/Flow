import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { clientSchema } from "@/schemas/clientsSchema";
import { AddressTypes } from "@/schemas/addressSchema";

/**
 * Helpers de ENDEREÇO como funções de módulo (fora da classe) — de propósito.
 *
 * Os handlers são registrados "soltos" nas rotas
 * (router.put("/:id", clientsController.update)). Quando o Express os chama,
 * `this` é undefined, então o antigo `this.updateAddress(...)` /
 * `this.createdAddress(...)` lançava TypeError -> 500. Era ESSA a causa de
 * "não consigo alterar o cliente". Tirando a lógica da classe, some o
 * problema de binding e o create/update voltam a funcionar.
 *
 * Bônus: adicionei `.select().single()` nas duas — sem isso o Supabase
 * retorna data=null e o cliente acabava salvo SEM address_id.
 */
async function createAddress(
  address?: AddressTypes,
): Promise<AddressTypes | null> {
  if (!address) return null;

  const { data, error } = await supabaseAdmin
    .from("address")
    .insert({
      street: address?.street || "",
      neighborhood: address?.neighborhood || "",
      city: address?.city || "",
      state: address?.state || "",
      zip_code: address?.zip_code || "",
      number: address?.number || "S/N",
      complement: address?.complement || "",
    })
    .select()
    .single();

  if (error) throw error;
  return data as AddressTypes;
}

async function updateAddress(
  address?: AddressTypes,
): Promise<AddressTypes | null> {
  if (!address?.id) return null;

  const { data, error } = await supabaseAdmin
    .from("address")
    .update({
      street: address?.street || "",
      neighborhood: address?.neighborhood || "",
      city: address?.city || "",
      state: address?.state || "",
      zip_code: address?.zip_code || "",
      number: address?.number || "S/N",
      complement: address?.complement || "",
    })
    .eq("id", address.id)
    .select()
    .single();

  if (error) throw error;
  return data as AddressTypes;
}

const CLIENT_SELECT = `
  id,
  document,
  name_client,
  email,
  phone,
  is_active,
  address!address_id(*)
`;

class ClientsController {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { data, error } = await supabaseAdmin
        .from("clients")
        .select(CLIENT_SELECT)
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
        .select(CLIENT_SELECT)
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
        .select(CLIENT_SELECT)
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

      const address = await createAddress(client.address);

      const { data, error } = await supabaseAdmin
        .from("clients")
        .insert({
          corporation_id: req.company?.id,
          document: client.document,
          name_client: client.name_client,
          email: client.email,
          phone: client.phone,
          is_active: client.is_active,
          address_id: address?.id ?? null,
        })
        .select(CLIENT_SELECT)
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

      const address = await updateAddress(client.address);
      // mantém o vínculo mesmo que o endereço não tenha sido alterado/retornado
      const addressId = address?.id ?? client.address?.id ?? null;

      const { data, error } = await supabaseAdmin
        .from("clients")
        .update({
          document: client.document,
          name_client: client.name_client,
          email: client.email,
          phone: client.phone,
          is_active: client.is_active,
          address_id: addressId,
        })
        .eq("corporation_id", req.company?.id)
        .eq("id", id)
        .select(CLIENT_SELECT)
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
      const { is_active } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Id is required" });
      }
      if (typeof is_active !== "boolean") {
        return res
          .status(400)
          .json({ error: "is_active (boolean) é obrigatório" });
      }
      const { data, error } = await supabaseAdmin
        .from("clients")
        .update({ is_active })
        .eq("corporation_id", req.company?.id)
        .eq("id", id)
        .select(CLIENT_SELECT)
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const clientsController = new ClientsController();
