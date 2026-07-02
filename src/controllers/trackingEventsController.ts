import { NextFunction, Response } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";

class TrackingEventsController {
  async findByItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }
      const { item_id } = req.params;

      // valida que o item pertence à empresa
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("orderitem")
        .select("id, company_id")
        .eq("id", item_id)
        .eq("company_id", req.company.id)
        .single();
      if (itemErr || !item) {
        return res.status(404).json({ error: "Order item not found" });
      }

      // número único de rastreio = VG da viagem (reaproveitado)
      const { data: link } = await supabaseAdmin
        .from("order_add_itens")
        .select(`orders!order_id ( tracking )`)
        .eq("order_item_id", item_id)
        .single();

      const { data: events, error } = await supabaseAdmin
        .from("trackingevents")
        .select(
          `
          id,
          location_item,
          description_item,
          created_at,
          status!status_id ( id, code, name )
        `,
        )
        .eq("order_item_id", item_id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      return res.status(200).json({
        tracking: (link as any)?.orders?.tracking ?? null,
        events: events ?? [],
      });
    } catch (error) {
      next(error);
    }
  }
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(403).json({ error: "Company context not found" });
      }

      // permissão: conjunto exato (exclui Financer, que o hierárquico incluiria)
      const profile = (req.user as any)?.user_metadata?.profile_user;
      const ALLOWED = ["Manager", "Admin", "Requestor"];
      if (!profile || !ALLOWED.includes(profile)) {
        return res
          .status(403)
          .json({ error: "Sem permissão para editar eventos de rastreio" });
      }

      const { event_id } = req.params;
      const { created_at, location_item } = req.body;
      if (created_at === undefined && location_item === undefined) {
        return res.status(400).json({ error: "Nada para atualizar" });
      }

      const { data: ev, error: evErr } = await supabaseAdmin
        .from("trackingevents")
        .select("id, orderitem:order_item_id ( company_id )")
        .eq("id", event_id)
        .single();
      if (
        evErr ||
        !ev ||
        (ev as any).orderitem?.company_id !== req.company.id
      ) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      const patch: any = { updated_at: new Date().toISOString() };
      if (created_at !== undefined) {
        const d = new Date(created_at);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: "Data/hora inválida" });
        }
        patch.created_at = d.toISOString();
      }
      if (location_item !== undefined) patch.location_item = location_item;

      const { data, error } = await supabaseAdmin
        .from("trackingevents")
        .update(patch)
        .eq("id", event_id)
        .select(
          `id, created_at, location_item, description_item,
           status!status_id ( id, code, name )`,
        )
        .single();
      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const trackingEventsController = new TrackingEventsController();
