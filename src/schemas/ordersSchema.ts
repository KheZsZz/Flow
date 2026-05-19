import { z } from 'zod';
import { OrderTypeSchema } from '@/schemas/enumSchema'

export const orderSchema = z.object({
  id: z.string().uuid().optional(), 
  company_id: z.string().uuid('ID da empresa inválido'),

  status_id: z.string().uuid('ID do status inválido'),

  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid('ID do criador inválido').optional(),
});

export const orderItemSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid('ID da empresa inválido'),
  invoice_id: z.string().uuid('ID da nota fiscal inválido'),
  type_orders: OrderTypeSchema.default('Entrega'),
  tracking: z.string().max(255).nullable().optional(),
  
  status_id: z.string().uuid('ID do status inválido'),

  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid('ID do criador inválido').optional(),
});

export const orderReceiptSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid('ID da empresa inválido'),
  order_item_id: z.string().uuid('ID do item do pedido inválido'),
  url: z.string().url('URL do comprovante inválida').max(255), 

  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid('ID do criador inválido').optional(),
});

export const orderAddItensSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido'),
  order_item_id: z.string().uuid('ID do item do pedido inválido'),
});


export type OrderAddItensType = z.infer<typeof orderAddItensSchema>;
export type OrderItemType = z.infer<typeof orderItemSchema>;
export type OrderReceiptType = z.infer<typeof orderReceiptSchema>;
export type OrderType = z.infer<typeof orderSchema>;