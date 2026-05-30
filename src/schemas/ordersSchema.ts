import { z } from "zod";
import { OrderTypeSchema } from "@/schemas/enumSchema";

export const orderVehicleSchema = z.object({
  vehicle_id: z.string().uuid("ID do veículo inválido"),
  role: z.enum(["Cavalo", "carreta"]).default("Cavalo"),
  position: z.number().int().min(1).default(1),
});

export const orderItemInputSchema = z
  .object({
    invoice_id: z.string().uuid("ID da nota fiscal inválido").optional(),
    collection_id: z.string().uuid("ID da coleta inválido").optional(),
    type_orders: OrderTypeSchema,
    status_id: z.string().uuid("ID do status inválido"),
  })
  .refine((d) => !!d.invoice_id !== !!d.collection_id, {
    message: "Informe invoice_id ou collection_id — não os dois",
  });

export const orderSchema = z.object({
  status_id: z.string().uuid("ID do status inválido"),
  driver_id: z.string().uuid("ID do motorista inválido"),
  delivery_date: z.coerce.date({ error: "Data de entrega inválida" }),
  notes: z.string().max(500).optional(),
  vehicles: z.array(orderVehicleSchema).min(1, "Informe ao menos um veículo"),
  items: z.array(orderItemInputSchema).optional(),
});

export const updateOrderStatusSchema = z.object({
  status_id: z.string().uuid("ID do status inválido"),
});

export const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid("ID do cliente inválido"),
  address_id: z.string().uuid("ID do endereço inválido").optional(),
  description: z.string().max(500).optional(),
  scheduled_date: z.coerce.date().optional(),
  status_id: z.string().uuid("ID do status inválido"),
});

export type CreateOrderType = z.infer<typeof orderSchema>;
export type OrderVehicleType = z.infer<typeof orderVehicleSchema>;
export type OrderItemInputType = z.infer<typeof orderItemInputSchema>;
export type UpdateOrderStatusType = z.infer<typeof updateOrderStatusSchema>;
export type CollectionType = z.infer<typeof collectionSchema>;
