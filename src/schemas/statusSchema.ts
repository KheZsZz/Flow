import { z } from "zod";

export const statusSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.coerce.number().min(1).max(999),
  name: z.string().min(1, "O nome é obrigatório").max(255),
  description: z.string().min(1, "A descrição é obrigatória").max(255),
  is_active: z.boolean().default(true).optional(),

  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid("ID do criador inválido").optional(),
});

export const StatusUpdateSchema = statusSchema.omit({
  created_at: true,
  updated_at: true,
  created_by: true,
});

export type StatusTypes = z.infer<typeof statusSchema>;
