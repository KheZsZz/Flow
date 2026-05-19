import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "validation_error",
      message: "Os dados enviados são inválidos.",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }


  if (err.code) {
    switch (err.code) {
    
      case "23505": 
        return res.status(409).json({
          status: "conflict",
          message: "Este registro já existe no sistema.",
          detail: err.detail || undefined
        });

     
      case "22P02":
        return res.status(400).json({
          status: "bad_request",
          message: "O formato do identificador (ID) ou dado enviado é inválido.",
        });

     
      case "23503":
        return res.status(404).json({
          status: "not_found",
          message: "O registro pai associado não foi encontrado (relação inválida).",
        });
    }
  }


  const isAuthError = 
    err.status === 401 || 
    err.name === "AuthApiError" || 
    err.message?.toLowerCase().includes("invalid claim") ||
    err.message?.toLowerCase().includes("unauthorized") ||
    err.message?.toLowerCase().includes("jwt");

  if (isAuthError) {
    return res.status(401).json({
      status: "unauthorized",
      message: err.message || "Acesso não autorizado.",
    });
  }

  const statusCode = err.status || err.statusCode || 500;

  if (statusCode === 404) {
    return res.status(404).json({
      status: "not_found",
      message: err.message || "Recurso não encontrado.",
    });
  }

  if (statusCode === 405) {
    return res.status(405).json({
      status: "method_not_allowed",
      message: err.message || "Método HTTP não permitido para esta rota.",
    });
  }

  if (statusCode === 409) {
    return res.status(409).json({
      status: "conflict",
      message: err.message || "Houve um conflito na requisição.",
    });
  }

  return res.status(statusCode).json({
    status: "error",
    message: statusCode === 500 ? "Erro interno do servidor." : err.message,
  });
};