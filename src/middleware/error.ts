import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "validation_error",
      message: "Invalid data",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 405
  // 404

  if (err.status === 401 || err.message.includes("invalid claim")) {
    return res.status(401).json({
      status: "unauthorized",
      message: "Unauthorized access",
    });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal server error",
  });
};
