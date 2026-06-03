import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabase, supabaseAdmin } from "@/config/supabase";
import {
  LoginUserType,
  UserSchema,
  LoginUserSchema,
  RegisterUserSchema,
} from "@/schemas/usersSchema";
import { toE164 } from "@/utils/convert_phone";

class UserController {
  async signUp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name_user, email_user, password_user, phone_user, profile_user } =
        RegisterUserSchema.parse(req.body);

      if (!req.company?.id || !req.user?.id) {
        return res
          .status(403)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email_user,
        password: password_user,
        email_confirm: true,
        user_metadata: {
          name_user,
          phone_user,
          profile_user,
          created_by: req.user.id,
        },
      });

      if (error) throw error;
      if (!data.user) {
        return res.status(500).json({ error: "Falha ao criar usuário" });
      }

      const { error: corpError } = await supabaseAdmin
        .from("corporationusers")
        .insert({
          corporation_id: req.company.id,
          manager_id: data.user.id,
        });

      if (corpError) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        throw corpError;
      }

      return res.status(201).json({
        message: "User registered successfully.",
        data: {
          id: data.user.id,
          email: data.user.email,
          name_user,
          profile_user,
          corporation_id: req.company.id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data: belongs, error: belongsError } = await supabaseAdmin
        .from("corporationusers")
        .select("manager_id")
        .eq("manager_id", id)
        .eq("corporation_id", req.company?.id)
        .single();

      if (belongsError || !belongs) {
        return res
          .status(403)
          .json({ error: "User does not belong to your corporation" });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(id as string);
      if (error) throw error;

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const {
        phone_user,
        name_user,
        email_user,
        profile_user,
        password_user,
        avatar_url,
        is_active,
      } = UserSchema.parse(req.body);

      const { data: belongs, error: belongsError } = await supabaseAdmin
        .from("corporationusers")
        .select("manager_id")
        .eq("manager_id", id)
        .eq("corporation_id", req.company?.id)
        .single();

      if (belongsError || !belongs) {
        return res
          .status(403)
          .json({ error: "User does not belong to your corporation" });
      }

      const updateAuthParams: any = {};
      if (email_user) updateAuthParams.email = email_user;
      if (password_user) updateAuthParams.password = password_user;
      if (phone_user) updateAuthParams.phone = toE164(phone_user);

      if (Object.keys(updateAuthParams).length > 0) {
        const { error: authUpdateError } =
          await supabaseAdmin.auth.admin.updateUserById(
            id as string,
            updateAuthParams,
          );
        if (authUpdateError) throw authUpdateError;
      }

      const { data, error: dbError } = await supabase
        .from("users")
        .update({
          name_user,
          email_user,
          profile_user,
          avatar_url,
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (dbError) throw dbError;

      return res
        .status(200)
        .json({ message: "User updated successfully", data });
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      res.status(200).json({ message: "User disabled successfully", data });
    } catch (error) {
      next(error);
    }
  }

  async findbyId(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id);
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async signIn(req: Request, res: Response, next: NextFunction) {
    const { email_user, password_user }: LoginUserType = LoginUserSchema.parse(
      req.body,
    );

    if (!email_user || !password_user) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email_user,
        password: password_user,
      });
      if (error) throw error;
      res
        .status(200)
        .json({ authorized: true, token: data.session.access_token });
    } catch (error) {
      next(error);
    }
  }

  async signOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) return res.status(400).json({ error: error.message });

      res
        .status(200)
        .json({ authorized: false, message: "User signed out successfully." });
    } catch (error) {
      next(error);
    }
  }

  async findDrivesById(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      if (!req.company?.id)
        throw new Error("Company context not found in request");

      const { data, error } = await supabase
        .from("corporationusers")
        .select(
          `
          users!manager_id (
            id,
            name_user,
            email_user,
            phone_user,
            is_active,
            profile_user,
            drivers!user_id (
              cnh,
              validade_cnh,
              categoria_cnh,
              mopp
            )
          )
        `,
        )
        .eq("corporation_id", req.company?.id)
        .eq("manager_id", id) // ← filtra o motorista pelo id da rota
        .single();

      if (error) throw error;

      const user = (data as any).users;

      if (!user || user.profile_user !== "Driver") {
        return res
          .status(404)
          .json({ error: "Driver not found in your corporation" });
      }

      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async findAllDrivers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.company?.id;

      if (!companyId) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabase
        .from("corporationusers")
        .select(
          `
          users!manager_id (
            id,
            name_user,
            email_user,
            phone_user,
            is_active,
            profile_user,
            drivers!user_id (
              cnh,
              validade_cnh,
              categoria_cnh,
              mopp
            )
          )
        `,
        )
        .eq("corporation_id", companyId);

      if (error) throw error;

      const drivers = data
        .map((row) => row.users as any)
        .filter((user) => user !== null && user.profile_user === "Driver");

      return res.status(200).json(drivers);
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", req.user?.id)
      .single();

    return res.json({
      user: data,
      company: req.company,
    });
  }
}

export const userController = new UserController();
