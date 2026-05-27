import { z } from "zod";

export const statusSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.number().min(1).max(99),
  name: z.string().min(1, "O nome é obrigatório").max(255),
  description: z.string().min(1, "A descrição é obrigatória").max(255),

  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid("ID do criador inválido").optional(),
});

export type StatusTypes = z.infer<typeof statusSchema>;
