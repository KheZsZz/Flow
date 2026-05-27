import { z } from "zod";

export const AddressSchema = z.object({
  id: z.string().uuid().optional(),
  street: z.string().max(255, "Rua deve ter no máximo 255 caracteres"),
  city: z.string().max(255, "Cidade deve ter no máximo 255 caracteres"),
  state: z.string().max(255, "Estado deve ter no máximo 255 caracteres"),
  zip_code: z
    .string()
    .max(8, "CEP deve ter no máximo 20 caracteres")
    .regex(/^\d{5}-\d{3}$/, {
      message: "Formato de CEP inválido. O formato correto é XXXXX-XXX.",
    }),
});

export type AddressTypes = z.infer<typeof AddressSchema>;
