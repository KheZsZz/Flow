import { z } from "zod";
import { GoalMetricSchema, GoalPeriodSchema } from "@/schemas/enumSchema";

export const goalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid("Selecione o usuário da meta"),
  metric: GoalMetricSchema,
  target_value: z.coerce
    .number({ message: "Informe um número válido" })
    .positive("A meta deve ser maior que zero"),
  period: GoalPeriodSchema.default("Diária"),
  is_active: z.boolean().default(true),
  corporation_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
});

// Para edição parcial (PATCH)
export const updateGoalSchema = goalSchema.partial();

// Rótulos legíveis para os selects / listagem
export const GOAL_METRIC_LABELS: Record<string, string> = {
  entregas_concluidas: "Entregas concluídas",
  coletas_concluidas: "Coletas concluídas",
  ordens_criadas: "Ordens criadas",
  notas_lancadas: "Notas lançadas",
};

// Pronto para options do ControlledInput variant="select"
export const GOAL_METRIC_OPTIONS = Object.entries(GOAL_METRIC_LABELS).map(
  ([value, label]) => ({ label, value }),
);

export const GOAL_PERIOD_OPTIONS = [
  { label: "Diária", value: "Diária" },
  { label: "Semanal", value: "Semanal" },
  { label: "Mensal", value: "Mensal" },
];

export type GoalType = z.infer<typeof goalSchema>;
export type UpdateGoalType = z.infer<typeof updateGoalSchema>;
