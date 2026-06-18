import { supabaseAdmin } from "@/config/supabase";

export interface AuditEntry {
  corporation_id?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  action: "INSERT" | "UPDATE" | "DELETE" | string;
  entity: string; // 'users' | 'vehicles' | 'orders' | 'goals' ...
  entity_id?: string | null;
  summary?: string | null;
  before?: any;
  after?: any;
}

/**
 * Registra um evento de auditoria.
 * Nunca lança erro para fora: auditoria não pode quebrar o fluxo principal.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      corporation_id: entry.corporation_id ?? null,
      actor_id: entry.actor_id ?? null,
      actor_name: entry.actor_name ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      summary: entry.summary ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
  } catch (err) {
    console.error("[auditService] falha ao registrar evento:", err);
  }
}
