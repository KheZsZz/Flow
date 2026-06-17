import { z } from "zod";

export const driverPayloadSchema = z.object({
  cnh: z.string().trim().min(1, "CNH obrigatória").max(20),
  validade_cnh: z.coerce.date({ message: "Validade da CNH inválida" }),
  categoria_cnh: z.string().trim().min(1, "Categoria obrigatória").max(20),
  mopp: z.boolean().optional().default(false),
  moop_validade: z.coerce.date().nullish(),
});

export type DriverPayloadType = z.infer<typeof driverPayloadSchema>;
