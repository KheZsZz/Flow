import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/schemas/collectionsSchema";

const COLLECTION_SELECT = `
  id,
  code,
  collection_address,
  quantity,
  weight,
  description,
  scheduled_date,
  is_active,
  created_at,
  finaled_at,
  status!status_id ( id, code, name ),
  clients!client_id ( id, name_client, document, phone ),
  address!address_id ( id, street, neighborhood, city, state, zip_code )
`;

async function isLinkedToOrder(
  companyId: string,
  collectionId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("orderitem")
    .select("id")
    .eq("company_id", companyId)
    .eq("collection_id", collectionId)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

class CollectionsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const body = createCollectionSchema.parse(req.body);

      let statusId = body.status_id;
      if (!statusId) {
        const { data: st, error: stErr } = await supabaseAdmin
          .from("status")
          .select("id")
          .eq("corporation_id", req.company.id)
          .eq("code", 100)
          .single();
        if (stErr || !st) {
          return res
            .status(500)
            .json({ error: "Status 'Em Aberto' (100) não configurado" });
        }
        statusId = st.id;
      }

      const { data, error } = await supabaseAdmin
        .from("collections")
        .insert({
          corporation_id: req.company.id,
          client_id: body.client_id,
          collection_address: body.collection_address ?? null,
          quantity: body.quantity ?? null,
          weight: body.weight ?? null,
          description: body.description ?? null,
          scheduled_date: body.scheduled_date ?? null,
          status_id: statusId,
          created_by: req.user.id,
        })
        .select(COLLECTION_SELECT)
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const available = req.query.available === "true";

      const { data, error } = await supabaseAdmin
        .from("collections")
        .select(COLLECTION_SELECT)
        .eq("corporation_id", req.company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // coletas já vinculadas a algum item de viagem
      const { data: used, error: usedErr } = await supabaseAdmin
        .from("orderitem")
        .select("collection_id")
        .eq("company_id", req.company.id)
        .not("collection_id", "is", null);
      if (usedErr) throw usedErr;

      const usedIds = new Set(
        (used ?? []).map((r: any) => r.collection_id).filter(Boolean),
      );

      // anexa in_order a cada linha -> a UI sabe se pode excluir/alterar
      let rows = (data ?? []).map((c: any) => ({
        ...c,
        in_order: usedIds.has(c.id),
      }));

      if (available) {
        rows = rows.filter((c: any) => c.is_active && !c.in_order);
      }

      return res.status(200).json(rows);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("collections")
        .select(COLLECTION_SELECT)
        .eq("corporation_id", req.company.id)
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: "Coleta não encontrada" });
      }

      const in_order = await isLinkedToOrder(req.company.id, id);
      return res.status(200).json({ ...data, in_order });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      const body = updateCollectionSchema.parse(req.body);

      const { data: current, error: curErr } = await supabaseAdmin
        .from("collections")
        .select(`id, status!status_id ( code )`)
        .eq("corporation_id", req.company.id)
        .eq("id", id)
        .single();
      if (curErr || !current) {
        return res.status(404).json({ error: "Coleta não encontrada" });
      }

      // trava (Tópico 3): coleta vinculada a uma viagem não pode ser alterada
      if (await isLinkedToOrder(req.company.id, id)) {
        return res.status(409).json({
          error: "Coleta vinculada a uma viagem não pode ser alterada.",
        });
      }

      // trava: coleta concluída (code 102) não é editável
      if ((current as any).status?.code === 102) {
        return res
          .status(409)
          .json({ error: "Coleta concluída não pode ser alterada" });
      }

      const patch: Record<string, any> = {};
      if (body.client_id !== undefined) patch.client_id = body.client_id;
      if (body.collection_address !== undefined)
        patch.collection_address = body.collection_address;
      if (body.quantity !== undefined) patch.quantity = body.quantity;
      if (body.weight !== undefined) patch.weight = body.weight;
      if (body.description !== undefined) patch.description = body.description;
      if (body.scheduled_date !== undefined)
        patch.scheduled_date = body.scheduled_date;
      if (body.status_id !== undefined) patch.status_id = body.status_id;

      const { data, error } = await supabaseAdmin
        .from("collections")
        .update(patch)
        .eq("corporation_id", req.company.id)
        .eq("id", id)
        .select(COLLECTION_SELECT)
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== "boolean") {
        return res
          .status(400)
          .json({ error: "is_active (boolean) é obrigatório" });
      }

      const { data, error } = await supabaseAdmin
        .from("collections")
        .update({ is_active })
        .eq("corporation_id", req.company.id)
        .eq("id", id)
        .select(COLLECTION_SELECT)
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;

      const { data: current, error: curErr } = await supabaseAdmin
        .from("collections")
        .select("id")
        .eq("corporation_id", req.company.id)
        .eq("id", id)
        .single();
      if (curErr || !current) {
        return res.status(404).json({ error: "Coleta não encontrada" });
      }

      if (await isLinkedToOrder(req.company.id, id as string)) {
        return res.status(409).json({
          error: "Coleta vinculada a uma viagem não pode ser excluída.",
        });
      }

      const { error } = await supabaseAdmin
        .from("collections")
        .delete()
        .eq("corporation_id", req.company.id)
        .eq("id", id);
      if (error) throw error;

      return res.status(200).json({ message: "Coleta excluída com sucesso" });
    } catch (error) {
      next(error);
    }
  }
}

export const collectionsController = new CollectionsController();
