import { z } from "zod";
import { statusSchema } from "./statusSchema";

export const createCollectionSchema = z.object({
  client_id: z.string().uuid("ID do cliente inválido"),
  address_id: z.string().uuid("ID do endereço inválido").optional(),
  description: z.string().max(500).optional(),
  scheduled_date: z.coerce.date().optional(),
  status: statusSchema,
});

export const updateCollectionSchema = createCollectionSchema.partial();

export type CreateCollectionType = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionType = z.infer<typeof updateCollectionSchema>;
