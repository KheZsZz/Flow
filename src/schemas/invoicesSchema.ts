import { z } from "zod";

export const invoiceSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid("ID do cliente inválido"),

  barcode: z
    .string()
    .min(44, "A chave de acesso/código de barras deve ter 44 caracteres")
    .max(44, "A chave de acesso/código de barras deve ter 44 caracteres")
    .regex(/^\d+$/, "O código de barras deve conter apenas números"),

  nfe: z.string().min(1, "O número da NF-e é obrigatório").max(20),
  serie_nf: z.string().min(1, "A série da NF-e é obrigatória").max(20),
  cte: z.string().min(1, "O CT-e é obrigatório").max(20),
  cte_value: z.coerce
    .number()
    .min(0, "O valor do CT-e não pode ser negativo")
    .multipleOf(0.01, "O valor deve ter no máximo 2 casas decimais"),
  value_nfe: z.coerce
    .number()
    .min(0, "O valor da NF-e não pode ser negativo")
    .multipleOf(0.01, "O valor deve ter no máximo 2 casas decimais"),

  issuer_id: z.string().uuid("ID do emitente inválido"),
  receiver_id: z.string().uuid("ID do destinatário inválido"),

  issue_date: z.coerce.date({ error: "A data de emissão é obrigatória" }),

  nature_transaction: z
    .string()
    .min(1, "A natureza da operação é obrigatória")
    .max(255),
  weight_brute: z.string().min(1, "O peso bruto é obrigatório").max(255),
  quantity_volumes: z
    .string()
    .min(1, "A quantidade de volumes é obrigatória")
    .max(255),
  observation: z.string().max(255).default(""),

  xml_nfe_url: z.string().url("URL do XML da NF-e inválida").max(255),
  xml_cte_url: z.string().url("URL do XML do CT-e inválida").max(255),

  created_by: z.string().uuid("ID do criador inválido").optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  corporation_id: z.string().uuid("ID da empresa inválido").optional(),
});

export type InvoiceTypes = z.infer<typeof invoiceSchema>;
