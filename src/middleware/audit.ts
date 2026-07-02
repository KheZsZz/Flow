import { Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { logAudit } from "@/services/auditService";

const ENTITY_LABEL: Record<string, string> = {
  users: "usuário",
  drivers: "motorista",
  vehicles: "veículo",
  orders: "viagem",
  collections: "coleta",
  invoices: "nota fiscal",
  clients: "cliente",
  status: "status",
  fuel: "abastecimento",
  expenses: "custo",
  maintenance: "manutenção",
};

const SKIP = new Set([
  "auth",
  "goals",
  "audit",
  "dashboard",
  "alerts",
  "address",
  "corporate",
]);

const KNOWN = new Set([...Object.keys(ENTITY_LABEL), ...SKIP]);

function actorName(req: AuthRequest): string | null {
  return (
    (req.user?.user_metadata?.name_user as string) ?? req.user?.email ?? null
  );
}

function looksLikeId(s?: string): boolean {
  return !!s && /^[0-9a-fA-F-]{8,}$/.test(s);
}

type Resolved = { action: string; entity: string; summary: string };

function resolve(method: string, seg: string[]): Resolved | null {
  const entity = seg[0];
  if (!entity || SKIP.has(entity) || !ENTITY_LABEL[entity]) return null;

  const label = ENTITY_LABEL[entity];

  // ── sub-ações conhecidas ────────────────────────────────────────────
  if (entity === "orders" && seg[2] === "baixar")
    return { action: "UPDATE", entity, summary: "Baixou itens da viagem" };
  if (entity === "orders" && seg[2] === "status")
    return { action: "UPDATE", entity, summary: "Alterou status da viagem" };
  if (entity === "users" && seg[1] === "avatar")
    return { action: "UPDATE", entity, summary: "Atualizou o avatar" };
  if (entity === "invoices" && seg[1] === "xml")
    return {
      action: "INSERT",
      entity,
      summary: "Importou nota fiscal via XML",
    };
  if (entity === "invoices" && seg[2] === "comprovante")
    return {
      action: "UPDATE",
      entity,
      summary: "Anexou comprovante de entrega",
    };

  // ── padrão por método ───────────────────────────────────────────────
  switch (method) {
    case "POST":
      return { action: "INSERT", entity, summary: `Criou ${label}` };
    case "PUT":
      return { action: "UPDATE", entity, summary: `Alterou ${label}` };
    case "PATCH":
      return { action: "UPDATE", entity, summary: `Atualizou ${label}` };
    case "DELETE":
      return { action: "DELETE", entity, summary: `Removeu ${label}` };
    default:
      return null;
  }
}

export function auditMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next();

  // captura o corpo da resposta (p/ pegar o id do registro criado)
  const originalJson = res.json.bind(res);
  let captured: any;
  (res as any).json = (body: any) => {
    captured = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    try {
      // só sucesso, e só com ator identificado
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.user?.id) return;

      const path = (req.originalUrl || "").split("?")[0];
      const all = path.replace(/^\/+/, "").split("/").filter(Boolean);

      // acha onde começa a rota "real" (ignora prefixos tipo /api)
      const start = all.findIndex((s) => KNOWN.has(s));
      if (start === -1) return;
      const seg = all.slice(start);

      const resolved = resolve(method, seg);
      if (!resolved) return;

      const urlId = looksLikeId(seg[1]) ? seg[1] : null;
      const entityId = urlId || captured?.id || captured?.data?.id || null;

      // fire-and-forget (logAudit já é não-fatal)
      void logAudit({
        corporation_id: req.company?.id ?? null,
        actor_id: req.user.id,
        actor_name: actorName(req),
        action: resolved.action,
        entity: resolved.entity,
        entity_id: entityId,
        summary: resolved.summary,
      });
    } catch (err) {
      console.error("[auditMiddleware] falha (ignorada):", err);
    }
  });

  next();
}
