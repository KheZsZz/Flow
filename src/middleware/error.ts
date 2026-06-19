import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // ── Validação (Zod) ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const errors = err.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    const first = errors[0];

    return res.status(400).json({
      status: "validation_error",
      code: "VALIDATION_ERROR",
      // message já vem específica (campo: motivo) p/ clientes que só leem message
      message: first
        ? `${first.field ? first.field + ": " : ""}${first.message}`
        : "Os dados enviados são inválidos.",
      errors, // lista completa p/ o front detalhar
    });
  }

  // ── Erros do Postgres (códigos SQLSTATE) ──────────────────────────
  if (err.code) {
    switch (err.code) {
      case "23505":
        return res.status(409).json({
          status: "conflict",
          code: "DB_UNIQUE_VIOLATION",
          message: "Este registro já existe no sistema.",
          detail: err.detail || undefined,
        });

      case "22P02":
        return res.status(400).json({
          status: "bad_request",
          code: "DB_INVALID_INPUT",
          message:
            "O formato do identificador (ID) ou dado enviado é inválido.",
        });

      case "23503":
        return res.status(409).json({
          status: "conflict",
          code: "DB_FK_VIOLATION",
          message:
            "Este registro está vinculado a outros e não pode ser alterado/removido.",
        });

      case "23502":
        return res.status(400).json({
          status: "bad_request",
          code: "DB_NOT_NULL_VIOLATION",
          message: "Um campo obrigatório não foi preenchido.",
        });
    }
  }

  // ── Autenticação ──────────────────────────────────────────────────
  const isAuthError =
    err.status === 401 ||
    err.name === "AuthApiError" ||
    err.message?.toLowerCase().includes("invalid claim") ||
    err.message?.toLowerCase().includes("unauthorized") ||
    err.message?.toLowerCase().includes("jwt");

  if (isAuthError) {
    return res.status(401).json({
      status: "unauthorized",
      code: "UNAUTHORIZED",
      message: err.message || "Acesso não autorizado.",
    });
  }

  const statusCode = err.status || err.statusCode || 500;

  if (statusCode >= 500) {
    console.error("[errorHandler]", {
      path: req.originalUrl,
      method: req.method,
      message: err?.message,
      stack: err?.stack,
    });
  }

  return res.status(statusCode).json({
    status: "error",
    message: statusCode === 500 ? "Erro interno do servidor." : err.message,
  });
};
