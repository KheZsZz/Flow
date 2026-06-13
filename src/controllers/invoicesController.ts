import { Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { invoiceSchema } from "@/schemas/invoicesSchema";
import { NfeClientDetails, nfeParserService } from "@/utils/nfeParse";

class InvoicesController {
  private findOrCreateClient = async (
    clientData: NfeClientDetails,
    corporationId: string,
    userId: string,
  ): Promise<string> => {
    const { data: clientId, error } = await supabaseAdmin.rpc(
      "upsert_client_with_address",
      {
        p_corporation_id: corporationId,
        p_user_id: userId,
        p_document: clientData.document,
        p_name: clientData.name,
        p_address: {
          street: clientData.address?.street || "",
          number: clientData.address?.number || "S/N",
          complement: clientData.address?.complement || "",
          neighborhood: clientData.address?.neighborhood || "",
          city: clientData.address?.city || "",
          state: clientData.address?.state || "",
          zip_code: clientData.address?.zip_code || "",
        },
      },
    );

    if (error) {
      console.error("Erro ao executar upsert_client_with_address:", error);
      throw error;
    }

    return clientId;
  };

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const bodyData = invoiceSchema.parse(req.body);
      const { mailer, recever, ...invoiceData } = bodyData;
      const { data: clients, error: clientsError } = await supabaseAdmin
        .from("clients")
        .select("id, document")
        .eq("corporation_id", req.company.id)
        .in("document", [mailer, recever]);

      if (clientsError) throw clientsError;

      const mailerClient = clients?.find((c) => c.document === mailer);
      const receverClient = clients?.find((c) => c.document === recever);

      if (!mailerClient || !receverClient) {
        return res.status(404).json({
          error:
            "Não foi possível criar a nota. Remetente ou Destinatário não cadastrado no sistema.",
          missing: {
            mailer: !mailerClient ? "Não Encontrado" : "OK",
            recever: !receverClient ? "Não Encontrado" : "OK",
          },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .insert({
          ...invoiceData,
          mailer_id: mailerClient.id, // FK Remetente
          recever_id: receverClient.id, // FK Destinatário
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

  async createFromXml(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      if (!req.file || req.file.size === 0) {
        return res.status(400).json({
          error: "Nenhum arquivo enviado ou o arquivo está vazio.",
        });
      }

      const extractedData = nfeParserService.parse(req.file.buffer);

      const { data: existing } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("barcode", extractedData.barcode)
        .eq("corporation_id", req.company.id)
        .maybeSingle();

      if (existing) {
        return res
          .status(409)
          .json({ error: "Nota fiscal já cadastrada no sistema." });
      }

      const mailerId = await this.findOrCreateClient(
        extractedData.mailer,
        req.company.id,
        req.user.id,
      );
      const receverId = await this.findOrCreateClient(
        extractedData.recever,
        req.company.id,
        req.user.id,
      );
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from("invoices")
        .insert({
          barcode: extractedData.barcode,
          nfe: extractedData.nfe,
          serie_nf: extractedData.serie_nf,
          cte: extractedData.cte || "AGUARDANDO",
          value_nfe: extractedData.value_nfe,
          issue_date: extractedData.issue_date,
          nature_transaction: extractedData.nature_transaction,
          weight_brute: extractedData.weight_brute,
          quantity_volumes: extractedData.quantity_volumes,
          observation: "Importado automaticamente via XML",
          xml_nfe_url: "", // verificar bucket
          xml_cte_url: "", // verificar bucket
          mailer_id: mailerId,
          recever_id: receverId,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      return res.status(201).json({
        message: "Nota fiscal importada e clientes validados com sucesso!",
        data: invoice,
      });
    } catch (error) {
      console.error("Erro no processamento da NF-e:", error);
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
        .select(
          `
          id,
          barcode,
          nfe,
          serie_nf,
          cte,
          cte_value,
          value_nfe,
          issue_date,
          nature_transaction,
          weight_brute,
          quantity_volumes,
          observation,
          xml_nfe_url,
          xml_cte_url,
          created_at,
          updated_at,
          remetente:clients!mailer_id ( id, name_client, document, address:address_id (*) ),
          destinatario:clients!recever_id ( id, name_client, document,address:address_id (*) )
        `,
        )
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
        .select(
          `
          id,
          barcode,
          nfe,
          serie_nf,
          cte,
          cte_value,
          value_nfe,
          issue_date,
          nature_transaction,
          weight_brute,
          quantity_volumes,
          observation,
          xml_nfe_url,
          xml_cte_url,
          created_at,
          updated_at,
          remetente:clients!mailer_id ( id, name_client, document, phone, email, is_active,address:address_id (*) ),
          destinatario:clients!recever_id ( id, name_client, document, phone, email, is_active,address:address_id (*) )
        `,
        )
        .eq("id", id)
        .eq("corporation_id", req.company.id)
        .maybeSingle();

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
        .select(
          `
          id,
          barcode,
          nfe,
          serie_nf,
          cte,
          cte_value,
          value_nfe,
          issue_date,
          nature_transaction,
          weight_brute,
          quantity_volumes,
          observation,
          xml_nfe_url,
          xml_cte_url,
          created_at,
          updated_at,
          remetente:clients!mailer_id ( id, name_client, document, phone, email, is_active,address:address_id (*) ),
          destinatario:clients!recever_id ( id, name_client, document, phone, email, is_active,address:address_id (*) )
        `,
        )
        .eq("corporation_id", req.company.id)
        .eq("nfe", nfe)
        .maybeSingle();

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

      const invoice = invoiceSchema.partial().parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .update({ ...invoice })
        .eq("id", id)
        .eq("corporation_id", req.company.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res
          .status(404)
          .json({ error: "Invoice not found or unauthorized" });
      }

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

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("corporation_id", req.company.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return res
          .status(404)
          .json({ error: "Invoice not found or unauthorized" });
      }

      return res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async findByBarcode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { barcode } = req.params;

      const { data, error } = await supabaseAdmin
        .from("invoices")
        .select(
          `
          id, barcode, nfe, serie_nf, value_nfe, weight_brute, issue_date,
          remetente:clients!mailer_id ( id, name_client, document ),
          destinatario:clients!recever_id ( id, name_client, document )
          `,
        )
        .eq("corporation_id", req.company.id)
        .eq("barcode", barcode)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Invoice not found" });
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const invoicesController = new InvoicesController();
