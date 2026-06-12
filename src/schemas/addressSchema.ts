import { z } from "zod";

export const AddressSchema = z
  .object({
    id: z.string().uuid().optional(),
    city: z.string().max(255, "Cidade deve ter no máximo 255 caracteres"),
    state: z.string().max(255, "Estado deve ter no máximo 255 caracteres"),
    number: z.string().optional(),
    street: z.string().max(255, "Rua deve ter no máximo 255 caracteres"),
    zip_code: z
      .string()
      .max(8, "CEP deve ter no máximo 20 caracteres")
      .regex(/^\d{5}\d{3}$/, {
        message: "Formato de CEP inválido. O formato correto é XXXXX-XXX.",
      }),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    fullAddress: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    fullAddress: `${data.street}, ${data.number || "S/N"}, ${data.neighborhood ? data.neighborhood + ", " : ""}${data.city} - ${data.state}, CEP: ${data.zip_code}`,
  }));
export type AddressTypes = z.infer<typeof AddressSchema>;
