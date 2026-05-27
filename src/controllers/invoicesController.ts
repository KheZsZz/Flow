import { Response, NextFunction } from "express";
import { supabase } from "@/config/supabase";
import { invoiceSchema } from "@/schemas/invoicesSchema";
import { AuthRequest } from "@/middleware/auth";
import { XMLParser } from "fast-xml-parser";

class InvoicesController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoice = invoiceSchema.parse(req.body);
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          ...invoice,
          created_by: req.user?.id,
        })
        .select();
      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const invoice = invoiceSchema.parse(req.body);
      const { data, error } = await supabase
        .from("invoices")
        .update({
          ...invoice,
          updated_by: req.user?.id,
        })
        .eq("id", id)
        .select();
      if (error) throw error;
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("corporation_id", req.company?.id);
      if (error) throw error;
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
  async findByNfe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("corporation_id", req.company?.id)
        .eq("invoice_number", code);

      if (error) throw error;

      if (data.length === 0) {
        return res.status(404).json({ error: "Nota fiscal não encontrada." });
      }
      res.json(data[0]);
    } catch (error) {
      next(error);
    }
  }

  async createFromXML(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "O arquivo XML da NF-e é obrigatório." });
      }

      const xmlData = req.file.buffer.toString("utf-8");
      const parser = new XMLParser({
        ignoreAttributes: false,
        numberParseOptions: {
          eNotation: false,
          hex: true,
          leadingZeros: true,
        },
      });
      const parsedXml = parser.parse(xmlData);

      const nfe = parsedXml.nfeProc?.NFe?.infNFe || parsedXml.NFe?.infNFe;

      if (!nfe) {
        return res
          .status(400)
          .json({ error: "XML inválido ou não estruturado como NF-e." });
      }

      console.log(nfe);

      const extractedData = {
        barcode: nfe.infAdic?.infCpl || null,
        invoice_number: nfe.ide?.nNF,
        series: nfe.ide?.serie,
        issue_date: nfe.ide?.dhEmi,
        total_value: parseFloat(nfe.total?.ICMSTot?.vNF || 0),
        issuer_cnpj: nfe.emit?.CNPJ,
        issuer_name: nfe.emit?.xNome,
        recipient_cnpj: nfe.dest?.CNPJ,
        recipient_name: nfe.dest?.xNome,
        //items: nfe.det ? (Array.isArray(nfe.det) ? nfe.det : [nfe.det]).map((item: any) => ({
        //    product_code: item.prod?.cProd,
        //    description: item.prod?.xProd,
        //    quantity: parseFloat(item.prod?.qCom || 0),
        //    unit_price: parseFloat(item.prod?.vUnCom || 0),
        //    total_price: parseFloat(item.prod?.vProd || 0),
        //})) : [],
      };
      const invoice = invoiceSchema.parse(extractedData);
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          ...invoice,
          created_by: req.user?.id,
        })
        .select();

      if (error) throw error;

      // salvar o xml em um bucket do supabase
      return res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const invoicesController = new InvoicesController();
