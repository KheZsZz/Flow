import { Request, Response, NextFunction } from "express";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";

export interface AuthRequest extends Request {
  user?: User;
  company?: {
    id: string;
    name: string;
    logo_url: string;
    is_active: boolean;
  };
}

const ROLE_HIERARCHY: Record<string, number> = {
  Manager: 6,
  Admin: 5,
  Financer: 4,
  Requestor: 3,
  Driver: 2,
  Commum: 1,
};

class AuthMiddleware {
  async authUser(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    // console.log("authHeader:", authHeader ? "presente" : "ausente");
    // console.log("token:", token ? token.substring(0, 20) + "..." : "ausente");

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

  async reqCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { data, error } = await supabase
        .from("corporationusers")
        .select("corporation_id, corporation:corporation_id ( id, name, logo_url, is_active )")
        .eq("manager_id", userId)
        .single();

      // console.log("data:", JSON.stringify(data));
      // console.log("error:", JSON.stringify(error));
      
      if (error || !data) {
        return res
          .status(403)
          .json({ error: "User is not linked to any corporation" });
      }

      const company = data.corporation as any;

      if (!company) {
        return res.status(403).json({ error: "Corporation not found" });
      }

      if (company.is_active === false) {
        return res
          .status(403)
          .json({ error: "This corporation account is inactive/suspended" });
      }

      req.company = {
        id: company.id,
        name: company.name,
        logo_url: company.logo_url,
        is_active: company.is_active,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  requireRole(...allowedRoles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const profile = user.user_metadata?.profile_user;

      if (!profile || !ROLE_HIERARCHY[profile]) {
        return res.status(403).json({ error: "Invalid user profile" });
      }

      const minRequired = Math.min(
        ...allowedRoles.map((r) => ROLE_HIERARCHY[r] ?? 0)
      );

      if (ROLE_HIERARCHY[profile] >= minRequired) {
        return next();
      }

      return res.status(403).json({
        error: `Access denied: Required roles: ${allowedRoles.join(", ")}`,
      });
    };
  }

  async isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    const profile = req.user?.user_metadata?.profile_user;
    if (!profile)
      return res.status(401).json({ error: "User not authenticated" });

    if (ROLE_HIERARCHY[profile] >= ROLE_HIERARCHY["Admin"]) return next();

    return res
      .status(403)
      .json({ error: "Access denied: Administrators only" });
  }
}

export const authMiddleware = new AuthMiddleware();