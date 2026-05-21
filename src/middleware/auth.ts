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

class AuthMiddleware {
  async authUser(req: AuthRequest, res: Response, next: NextFunction) {
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

  async reqCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) throw next(); 
        
      console.log("User ID from token:", userId);

      

      // const { data, error } = await supabase
      //   .from("corporationadmins")
      //   .select('mamger_id, corporation(id, name, logo_url, is_active)').eq("mamger_id", userId)

      // console.log("Company data:", data);
      // console.log("Company error:", error);

      // // if (error || !data || !data.corporation) {
      // //   return res
      // //     .status(403)
      // //     .json({ error: "User is not linked to any corporation" });
      // // }
      // // const company = data.corporation as any;
      // // if (company.is_active === false) {
      // //   return res
      // //     .status(403)
      // //     .json({ error: "This corporation account is inactive/suspended" });
      // // }

      // // req.company = company;
      next();
    } catch (error) {
      next(error);
    }
  }

  async isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const profile = user.user_metadata?.profile;

    if (profile !== "Admin" && profile !== "Manager") {
      return res.status(403).json({
        error: "Access denied: Administrators only",
      });
    }
    next();
  }
}

export const authMiddleware = new AuthMiddleware();
