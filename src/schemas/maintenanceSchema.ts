import { z } from "zod";

export const maintenanceSchema = z.object({
  id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid("Selecione o veículo"),
  maintenance_type: z.string().min(1, "Informe o tipo de manutenção").max(150),
  description: z.string().nullish(),
  cost: z.coerce.number().nonnegative("O custo deve ser maior ou igual a zero"),
  odometer: z.coerce.number().nonnegative().nullish(),
  performed_at: z.coerce.date().optional(),
  next_due_at: z.coerce.date().nullish(),
  receipt_url: z.string().url().nullish(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
});

export type MaintenanceType = z.infer<typeof maintenanceSchema>;
