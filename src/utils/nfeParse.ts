import { XMLParser } from "fast-xml-parser";

export interface NfeClientDetails {
  document: string;
  name: string;
}

export interface ExtractedNfeData {
  mailer: NfeClientDetails; // Remetente (Emitente)
  recever: NfeClientDetails; // Destinatário
  barcode: string;
  nfe: string;
  serie_nf: string;
  issue_date: string;
  nature_transaction: string;
  weight_brute: number;
  quantity_volumes: number;
  value_nfe: number;
  cte?: string | any;
}

class NfeParserService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  public parse(xmlBuffer: Buffer): ExtractedNfeData {
    const xmlString = xmlBuffer.toString("utf-8");
    const jsonObj = this.parser.parse(xmlString);

    const infNFe = jsonObj?.nfeProc?.NFe?.infNFe || jsonObj?.NFe?.infNFe;
    if (!infNFe) {
      throw new Error(
        "XML de NF-e inválido ou fora dos padrões estruturais da SEFAZ.",
      );
    }

    const rawId = infNFe["@_Id"] || infNFe["@_id"] || "";
    const barcode = rawId.replace(/\D/g, "");

    if (barcode.length !== 44) {
      throw new Error(
        `Chave de acesso inválida. Esperado 44 dígitos, extraído: ${barcode.length}`,
      );
    }

    const ide = infNFe.ide;
    const emit = infNFe.emit;
    const dest = infNFe.dest;
    const total = infNFe.total?.ICMSTot;
    const vol = infNFe.transp?.vol;

    const quantity_volumes = Array.isArray(vol)
      ? vol[0]?.qVol?.toString()
      : vol?.qVol?.toString() || "1";

    const weight_brute = Array.isArray(vol)
      ? vol[0]?.pesoB?.toString()
      : vol?.pesoB?.toString() || "0.000";

    const cleanMailerDoc = (emit?.CNPJ || emit?.CPF || "")
      .toString()
      .replace(/\D/g, "");
    const cleanReceverDoc = (dest?.CNPJ || dest?.CPF || "")
      .toString()
      .replace(/\D/g, "");

    if (!cleanMailerDoc || !cleanReceverDoc) {
      throw new Error(
        "Não foi possível extrair o CPF/CNPJ do remetente ou destinatário do XML.",
      );
    }

    return {
      barcode,
      nfe: ide?.nNF?.toString() || "",
      serie_nf: ide?.serie?.toString() || "",
      issue_date: ide?.dhEmi || ide?.dEmi || new Date().toISOString(),
      nature_transaction: ide?.natOp || "Venda ou Prestação de Serviço",
      value_nfe: parseFloat(total?.vNF || "0"),
      weight_brute,
      quantity_volumes,

      mailer: {
        document: cleanMailerDoc,
        name: emit?.xNome || "Remetente Não Identificado",
      },
      recever: {
        document: cleanReceverDoc,
        name: dest?.xNome || "Destinatário Não Identificado",
      },
    };
  }
}

export const nfeParserService = new NfeParserService();
