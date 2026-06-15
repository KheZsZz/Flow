import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/schemas/collectionsSchema";

// Select reaproveitado em todas as respostas da coleta.
const COLLECTION_SELECT = `
  id,
  code,
  description,
  scheduled_date,
  is_active,
  created_at,
  updated_at,
  status!status_id ( id, code, name ),
  clients!client_id ( id, name_client, document, phone ),
  address!address_id ( id, street, neighborhood, city, state, zip_code )
`;

class CollectionsController {
  // POST /collections
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const body = createCollectionSchema.parse(req.body);

      // status padrão = "Em Aberto" (code 100) da empresa, se não vier
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
          address_id: body.address_id ?? null,
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

  // GET /collections            -> todas as coletas da empresa
  // GET /collections?available  -> apenas as ainda não vinculadas a uma viagem
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const available = req.query.available === "true";

      let query = supabaseAdmin
        .from("collections")
        .select(COLLECTION_SELECT)
        .eq("corporation_id", req.company.id)
        .order("created_at", { ascending: false });

      if (available) {
        // coletas já vinculadas a algum item de viagem
        const { data: used, error: usedErr } = await supabaseAdmin
          .from("orderitem")
          .select("collection_id")
          .eq("company_id", req.company.id)
          .not("collection_id", "is", null);
        if (usedErr) throw usedErr;

        const usedIds = (used ?? [])
          .map((r: any) => r.collection_id)
          .filter(Boolean);

        if (usedIds.length > 0) {
          query = query.not("id", "in", `(${usedIds.join(",")})`);
        }
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  }

  // GET /collections/:id
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
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  // PUT /collections/:id
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { id } = req.params;
      const body = updateCollectionSchema.parse(req.body);

      // trava: coleta concluída (code 102) não é editável
      const { data: current, error: curErr } = await supabaseAdmin
        .from("collections")
        .select(`id, status!status_id ( code )`)
        .eq("corporation_id", req.company.id)
        .eq("id", id)
        .single();
      if (curErr || !current) {
        return res.status(404).json({ error: "Coleta não encontrada" });
      }
      if ((current as any).status?.code === 102) {
        return res
          .status(409)
          .json({ error: "Coleta concluída não pode ser alterada" });
      }

      const patch: Record<string, any> = {};
      if (body.client_id !== undefined) patch.client_id = body.client_id;
      if (body.address_id !== undefined) patch.address_id = body.address_id;
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

  // PATCH /collections/:id   -> ativar/inativar  { is_active: boolean }
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
}

export const collectionsController = new CollectionsController();
