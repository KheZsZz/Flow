// src/controllers/orderReceiptsController.ts
import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";

const BUCKET = "comprovantes";

class OrderReceiptsController {
  // POST /orders/items/:item_id/comprovante  (multipart, campo "comprovante")
  // Envia o canhoto, registra em OrderReceipts e conclui o item (200 -> 102).
  async uploadComprovante(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { item_id } = req.params;
      const file = (req as any).file;
      if (!file) {
        return res
          .status(400)
          .json({ error: "Arquivo 'comprovante' não enviado" });
      }

      // item + status atual + origem (nota/coleta)
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("orderitem")
        .select(`id, invoice_id, collection_id, status!status_id ( code )`)
        .eq("id", item_id)
        .eq("company_id", req.company.id)
        .single();
      if (itemErr || !item) {
        return res.status(404).json({ error: "Order item not found" });
      }

      const code = (item as any).status?.code;
      if (code !== 200) {
        return res.status(409).json({
          error:
            "O canhoto só pode ser enviado em 'Aguardando Canhoto' (200).",
          current_status_code: code,
        });
      }

      // upload no Storage
      const ext = (file.originalname?.split(".").pop() || "jpg").toLowerCase();
      const path = `${req.company.id}/${item_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

      // registra o comprovante do item
      const { error: recErr } = await supabaseAdmin
        .from("orderreceipts")
        .insert({
          company_id: req.company.id,
          order_item_id: item_id,
          url: publicUrl,
          created_by: req.user.id,
        });
      if (recErr) throw recErr;

      // se for nota, espelha no invoice (mantém a lista de notas coerente)
      if ((item as any).invoice_id) {
        await supabaseAdmin
          .from("invoices")
          .update({
            comprovante_url: publicUrl,
            comprovante_uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", (item as any).invoice_id)
          .eq("corporation_id", req.company.id);
      }

      // conclui o item: 200 -> 102 (guard permite; dispara finalize + propagação)
      const { data: s102, error: stErr } = await supabaseAdmin
        .from("status")
        .select("id")
        .eq("corporation_id", req.company.id)
        .eq("code", 102)
        .single();
      if (stErr || !s102) {
        return res
          .status(500)
          .json({ error: "Status 'Concluído' (102) não configurado" });
      }

      const { error: concErr } = await supabaseAdmin
        .from("orderitem")
        .update({ status_id: s102.id, updated_at: new Date() })
        .eq("id", item_id)
        .eq("company_id", req.company.id);
      if (concErr) {
        if ((concErr as any).code === "P0001") {
          return res.status(409).json({ error: (concErr as any).message });
        }
        throw concErr;
      }

      return res.status(200).json({ url: publicUrl, concluded: true });
    } catch (error) {
      next(error);
    }
  }

  // GET /orders/items/:item_id/receipts
  async findByItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { item_id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("orderreceipts")
        .select("id, url, created_at")
        .eq("order_item_id", item_id)
        .eq("company_id", req.company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json(data ?? []);
    } catch (error) {
      next(error);
    }
  }
}

export const orderReceiptsController = new OrderReceiptsController();
