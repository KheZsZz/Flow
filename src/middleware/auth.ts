import { Request, Response, NextFunction } from "express";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";

export interface AuthRequest extends Request {
  user?: User;
}

export class AuthMiddleware {
  async authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token not provided" });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user)
      return res.status(401).json({ error: "Invalid or expired session" });

    if (user.user_metadata?.is_active === false)
      return res.status(403).json({ error: "User inactive" });

    req.user = user;
    next();
  }

  async isManager(req: AuthRequest, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const profile = user.user_metadata?.profile;

    if (profile !== "manager") {
      return res.status(403).json({
        error: "Access denied: Administrators only",
      });
    }
    next();
  }
}
