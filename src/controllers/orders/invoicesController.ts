import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { invoiceSchema } from "@/schemas/invoicesSchema";
import { orderSchema, orderItemSchema, orderReceiptSchema } from "@/schemas/ordersSchema";

// ============================================================
// INVOICES
// ============================================================
class InvoicesController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const invoice = invoiceSchema.parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .insert({
          ...invoice,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select()
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

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .select(`
          id, barcode, nfe, serie_nf, cte, cte_value, value_nfe,
          issue_date, nature_transaction, weight_brute,
          quantity_volumes, observation, xml_nfe_url, xml_cte_url,
          created_at, updated_at,
          clients!client_id   ( id, name_client, document ),
          issuer:clients!issuer_id   ( id, name_client, document ),
          receiver:clients!receiver_id ( id, name_client, document )
        `)
        .eq("corporation_id", req.company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
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
        .from("invoices")
        .select(`
          id, barcode, nfe, serie_nf, cte, cte_value, value_nfe,
          issue_date, nature_transaction, weight_brute,
          quantity_volumes, observation, xml_nfe_url, xml_cte_url,
          created_at, updated_at,
          clients!client_id   ( id, name_client, document ),
          issuer:clients!issuer_id   ( id, name_client, document ),
          receiver:clients!receiver_id ( id, name_client, document )
        `)
        .eq("id", id)
        .eq("corporation_id", req.company.id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Invoice not found" });

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async findByNfe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { nfe } = req.params;

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("corporation_id", req.company.id)
        .eq("nfe", nfe)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Invoice not found" });

      return res.status(200).json(data);
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
      const invoice = invoiceSchema.parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .update({ ...invoice })
        .eq("id", id)
        .eq("corporation_id", req.company.id)
        .select()
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

      const { error } = await supabaseAdmin
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("corporation_id", req.company.id);

      if (error) throw error;
      return res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export const invoicesController   = new InvoicesController();

