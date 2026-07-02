import { z } from "zod";

export const ExpenseCategorySchema = z.enum(["Operacional", "Administrativo"]);

export const expenseTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "O nome do tipo é obrigatório").max(150),
  category: ExpenseCategorySchema,
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
});

export const operationalExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  expense_type_id: z.string().uuid("Selecione o tipo de despesa"),
  order_id: z.string().uuid().nullish(),
  vehicle_id: z.string().uuid().nullish(),
  description: z.string().nullish(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  expense_date: z.coerce.date().optional(),
  receipt_url: z.string().url().nullish(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
});

export const administrativeExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  expense_type_id: z.string().uuid("Selecione o tipo de despesa"),
  department: z.string().max(150).nullish(),
  description: z.string().nullish(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  expense_date: z.coerce.date().optional(),
  receipt_url: z.string().url().nullish(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
});

export type ExpenseTypeType = z.infer<typeof expenseTypeSchema>;
export type OperationalExpenseType = z.infer<typeof operationalExpenseSchema>;
export type AdministrativeExpenseType = z.infer<
  typeof administrativeExpenseSchema
>;
