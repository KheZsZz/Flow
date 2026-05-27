import { z } from "zod";

export const CoporateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "O nome é obrigatório").max(255),
  cnpj: z
    .string()
    .min(14, "O CNPJ deve ter pelo menos 14 caracteres")
    .max(14, "O CNPJ deve ter no máximo 14 caracteres"),
  address_id: z.string().uuid("ID de endereço inválido"),
  phone: z
    .string()
    .max(16, { message: "O telefone deve ter no máximo 16 caracteres" })
    .regex(/^\(\d{2}\)\s\d\.\d{4}-\d{4}$/, {
      message: "O telefone deve estar no formato (XX) 9.XXXX-XXXX",
    }),
  manager_id: z.string().uuid("ID do gerente inválido").optional(),
  logo_url: z
    .string()
    .url("URL do logo inválida")
    .max(255)
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),

  created_at: z.coerce.date().optional().optional(),
  updated_at: z.coerce.date().optional().optional(),
  created_by: z.string().uuid("ID do criador inválido").optional(),
});

export type coporateType = z.infer<typeof CoporateSchema>;
