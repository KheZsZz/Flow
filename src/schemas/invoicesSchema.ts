import { z } from "zod";
import { clientSchema } from "@/schemas/clientsSchema";

export const invoiceSchema = z.object({
  id: z.string().uuid().optional(),

  mailer: clientSchema.shape.document,
  recever: clientSchema.shape.document,

  barcode: z
    .string()
    .length(
      44,
      "A chave de acesso/código de barras deve ter exatamente 44 caracteres",
    )
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

  issue_date: z.coerce.date({
    error: () => ({ message: "A data de emissão é obrigatória" }),
  }),

  nature_transaction: z
    .string()
    .min(1, "A natureza da operação é obrigatória")
    .max(255),

  weight_brute: z.coerce.number().min(0),
  quantity_volumes: z.coerce.number().int().min(0),

  observation: z.string().max(255).default(""),

  xml_nfe_url: z.string().url().max(255).optional().nullable(),
  xml_cte_url: z.string().url().max(255).optional().nullable(),

  created_by: z.string().uuid("ID do criador inválido").optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  corporation_id: z.string().uuid("ID da empresa inválido").optional(),
});

export type InvoiceTypes = z.infer<typeof invoiceSchema>;
