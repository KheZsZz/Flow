import { z } from "zod";

// Espelha a view document_alerts (somente leitura)
export const documentAlertSchema = z.object({
  corporation_id: z.string().uuid(),
  entity_kind: z.enum(["driver", "vehicle"]),
  entity_id: z.string().uuid(),
  entity_label: z.string(),
  doc_type: z.string(), // CNH | MOPP | CRLV | Seguro | ANTT/RNTRC | Tacógrafo
  expires_at: z.string(), // YYYY-MM-DD
  days_remaining: z.number().int(), // < 0 = vencido
});

export type DocumentAlertType = z.infer<typeof documentAlertSchema>;

// Severidade derivada de days_remaining (usada na UI dos alertas)
export type AlertSeverity = "vencido" | "critico" | "atencao" | "ok";

export function alertSeverity(daysRemaining: number): AlertSeverity {
  if (daysRemaining < 0) return "vencido";
  if (daysRemaining <= 7) return "critico";
  if (daysRemaining <= 30) return "atencao";
  return "ok";
}
