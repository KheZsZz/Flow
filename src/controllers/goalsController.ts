import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "@/middleware/auth";
import { supabaseAdmin } from "@/config/supabase";
import { logAudit } from "@/services/auditService";

const goalInput = z.object({
  user_id: z.string().uuid("Usuário inválido"),
  metric: z.enum([
    "entregas_concluidas",
    "coletas_concluidas",
    "ordens_criadas",
    "notas_lancadas",
  ]),
  target_value: z.coerce.number().positive("A meta deve ser maior que zero"),
  period: z.enum(["Diária", "Semanal", "Mensal"]).default("Diária"),
  is_active: z.boolean().default(true),
});

const actorName = (req: AuthRequest) =>
  (req.user?.user_metadata?.name_user as string) ?? req.user?.email ?? null;

class GoalsController {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("goals")
        .select(
          `
          id, user_id, metric, target_value, period, is_active, created_at,
          users!user_id ( name_user )
          `,
        )
        .eq("corporation_id", req.company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const goals = (data ?? []).map((g: any) => ({
        id: g.id,
        user_id: g.user_id,
        user_name: g.users?.name_user ?? null,
        metric: g.metric,
        target_value: g.target_value,
        period: g.period,
        is_active: g.is_active,
      }));

      return res.status(200).json(goals);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const input = goalInput.parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("goals")
        .insert({
          ...input,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select("id, user_id, metric, target_value, period, is_active")
        .single();

      if (error) {
        // 23505 = violação de índice único (meta ativa duplicada)
        if (error.code === "23505") {
          return res.status(409).json({
            error: "Já existe uma meta ativa igual para este usuário.",
          });
        }
        throw error;
      }

      await logAudit({
        corporation_id: req.company.id,
        actor_id: req.user.id,
        actor_name: actorName(req),
        action: "INSERT",
        entity: "goals",
        entity_id: data.id,
        summary: `Criou meta de ${input.metric}`,
        after: data,
      });

      return res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;
      const input = goalInput.partial().parse(req.body);

      const { data, error } = await supabaseAdmin
        .from("goals")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("corporation_id", req.company.id)
        .select("id, user_id, metric, target_value, period, is_active")
        .single();

      if (error) throw error;

      await logAudit({
        corporation_id: req.company.id,
        actor_id: req.user?.id,
        actor_name: actorName(req),
        action: "UPDATE",
        entity: "goals",
        entity_id: id as string,
        summary: "Atualizou meta",
        after: data,
      });

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      const { id } = req.params;

      const { error } = await supabaseAdmin
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("corporation_id", req.company.id);

      if (error) throw error;

      await logAudit({
        corporation_id: req.company.id,
        actor_id: req.user?.id,
        actor_name: actorName(req),
        action: "DELETE",
        entity: "goals",
        entity_id: id as string,
        summary: "Removeu meta",
      });

      return res.status(200).json({ message: "Meta removida com sucesso" });
    } catch (error) {
      next(error);
    }
  }
}

export const goalsController = new GoalsController();
