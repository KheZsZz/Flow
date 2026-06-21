import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabase, supabaseAdmin } from "@/config/supabase";
import { driverPayloadSchema } from "@/schemas/driverSchema";
import { z } from "zod";
import {
  LoginUserType,
  LoginUserSchema,
  RegisterUserSchema,
  UpdateUserSchema,
} from "@/schemas/usersSchema";
import { logAudit } from "@/services/auditService";
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
        .insert({ corporation_id: req.company.id, manager_id: data.user.id });

      if (corpError) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        throw corpError;
      }

      if (profile_user === "Driver") {
        const driver = driverPayloadSchema.parse(req.body);
        const { error: drvError } = await supabaseAdmin.from("drivers").insert({
          user_id: data.user.id,
          cnh: driver.cnh,
          validade_cnh: driver.validade_cnh.toISOString().split("T")[0],
          categoria_cnh: driver.categoria_cnh,
          mopp: driver.mopp,
          moop_validade: driver.moop_validade
            ? driver.moop_validade.toISOString().split("T")[0]
            : null,
          created_by: req.user.id,
        });
        if (drvError) {
          await supabaseAdmin
            .from("corporationusers")
            .delete()
            .eq("manager_id", data.user.id)
            .eq("corporation_id", req.company.id);
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
          throw drvError;
        }
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
      } = UpdateUserSchema.parse(req.body);

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

      const { data: drvRow } = await supabaseAdmin
        .from("drivers")
        .select("id")
        .eq("user_id", id)
        .maybeSingle();

      if (profile_user === "Driver") {
        const driver = driverPayloadSchema.parse(req.body);
        const driverData = {
          cnh: driver.cnh,
          validade_cnh: driver.validade_cnh.toISOString().split("T")[0],
          categoria_cnh: driver.categoria_cnh,
          mopp: driver.mopp,
          moop_validade: driver.moop_validade
            ? driver.moop_validade.toISOString().split("T")[0]
            : null,
          updated_at: new Date().toISOString(),
        };

        if (drvRow) {
          const { error } = await supabaseAdmin
            .from("drivers")
            .update(driverData)
            .eq("id", drvRow.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from("drivers")
            .insert({ ...driverData, user_id: id, created_by: req.user?.id });
          if (error) throw error;
        }
      } else if (drvRow) {
        const { count, error: cErr } = await supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("driver_id", drvRow.id);
        if (cErr) throw cErr;
        if ((count ?? 0) > 0) {
          return res.status(409).json({
            error:
              "Não é possível alterar o perfil: o motorista possui viagens vinculadas.",
          });
        }
        const { error: delErr } = await supabaseAdmin
          .from("drivers")
          .delete()
          .eq("id", drvRow.id);
        if (delErr) throw delErr;
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

  async toggleActive(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
      const { data: belongs, error: belongsError } = await supabaseAdmin
        .from("corporationusers")
        .select("manager_id")
        .eq("manager_id", id)
        .eq("corporation_id", req.company?.id)
        .single();
      if (belongsError || !belongs)
        return res
          .status(403)
          .json({ error: "User does not belong to your corporation" });

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
        id as string,
      );
      await supabaseAdmin.auth.admin.updateUserById(id as string, {
        user_metadata: { ...(authUser.user?.user_metadata ?? {}), is_active },
      });

      const { data, error } = await supabaseAdmin
        .from("users")
        .update({ is_active })
        .eq("id", id)
        .select("id, name_user, is_active")
        .single();
      if (error) throw error;

      return res.status(200).json({ message: "Status atualizado", data });
    } catch (error) {
      next(error);
    }
  }

  async findbyId(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `*, drivers!user_id ( id, cnh, validade_cnh, categoria_cnh, mopp, moop_validade )`,
        )
        .eq("id", id);
      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
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
          password_user,
          email_user,
          phone_user,
          is_active,
          profile_user,
          avatar_url
        )
      `,
        )
        .eq("corporation_id", companyId);
      if (error) throw error;

      const users = (data ?? [])
        .map((row) => (row as any).users)
        .filter((u) => u && u.id);

      res.status(200).json(users);
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
              id,
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

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", req.user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.json({ user: data, company: req.company });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        current_password: z.string().min(1, "Senha atual obrigatória"),
        new_password: z
          .string()
          .min(8, "A nova senha deve ter no mínimo 8 caracteres")
          .refine((v) => /[A-Z]/.test(v), "Precisa de uma letra maiúscula")
          .refine((v) => /\d/.test(v), "Precisa de um número"),
      });
      const { current_password, new_password } = schema.parse(req.body);

      const email = req.user?.email;
      if (!email || !req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current_password,
      });
      if (signInError) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
          password: new_password,
        });
      if (updateError) throw updateError;

      try {
        await logAudit({
          corporation_id: req.company?.id,
          actor_id: req.user.id,
          actor_name: req.user.user_metadata?.name_user ?? req.user.email,
          action: "UPDATE",
          entity: "users",
          entity_id: req.user.id,
          summary: "Alterou a própria senha",
        });
      } catch (auditErr) {
        console.error(
          "[changePassword] auditoria falhou (ignorado):",
          auditErr,
        );
      }

      return res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "Arquivo 'avatar' não enviado" });
      }

      const ext = (file.originalname?.split(".").pop() || "jpg").toLowerCase();
      const path = `${req.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);

      const { error: dbError } = await supabaseAdmin
        .from("users")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", req.user.id);
      if (dbError) throw dbError;

      return res.status(200).json({ avatar_url: publicUrl });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
