import { z } from "zod";

// Espelha a tabela audit_log (registros vêm prontos do banco)
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  corporation_id: z.string().uuid().nullish(),
  actor_id: z.string().uuid().nullish(),
  actor_name: z.string().nullish(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string().uuid().nullish(),
  summary: z.string().nullish(),
  before: z.any().nullish(),
  after: z.any().nullish(),
  created_at: z.string(),
});

// Filtros da aba de Auditoria (todos opcionais)
export const auditFilterSchema = z.object({
  entity: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  action: z.string().optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(), // ISO date
});

// Rótulos legíveis das entidades auditadas
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  users: "Usuários",
  drivers: "Motoristas",
  vehicles: "Veículos",
  orders: "Ordens / Viagens",
  collections: "Coletas",
  invoices: "Notas Fiscais",
  clients: "Clientes",
  goals: "Metas",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
};

export type AuditLogType = z.infer<typeof auditLogSchema>;
export type AuditFilterType = z.infer<typeof auditFilterSchema>;
