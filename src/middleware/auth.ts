import { Request, Response, NextFunction } from "express";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";

export interface AuthRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token not provided" });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user)
    return res.status(401).json({ error: "Invalid or expired session" });

  req.user = user;
  next();
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  const profile = user.user_metadata?.profile;

  if (profile !== "admin") {
    return res.status(403).json({
      error: "Access denied: Administrators only",
    });
  }

  next();
};
