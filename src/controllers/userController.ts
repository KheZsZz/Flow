import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "@/middleware/auth";
import { supabase } from "@/config/supabase";
import { UserSchema, UserType } from "@/schemas/usersSchema";

class UserController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const { document_user, name_user, email_user, password_user }: UserType =
      UserSchema.parse(req.body);

    const { data, error } = await supabase
      .from("users")
      .insert({
        document_user,
        name_user,
        email_user,
        password_user,
        created_by: req.user?.id,
      })
      .select();

    if (error) throw error;
    res.status(201).json({ message: "User created successfully", data });
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    const {
      document_user,
      name_user,
      email_user,
      profile,
      password_user,
      avatar_url,
      created_by,
    }: UserType = UserSchema.parse(req.body);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          document_user,
          name_user,
          email_user,
          profile,
          password_user,
          avatar_url,
          created_by,
        })
        .eq("id", id);
      if (error) throw error;
      res.status(200).json({ message: "User updated successfully", data });
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ is_active: true })
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

  async findAllDrivers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.company?.id;

      if (!companyId) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data: drivers, error } = await supabase
        .from("Drivers")
        .select(
          `
          cnh,
          validade_cnh,
          categoria_cnh,

          Users!user_id (
            id,
            name_user,
            phone,
            is_active,
            corporation_id
          )
        `,
        )
        .eq("Users.corporation_id", companyId);

      if (error) throw error;
      const validDrivers = drivers.filter((driver) => driver.Users !== null);

      const formattedDrivers = validDrivers.map((driver) => {
        const userData = driver.Users as any;

        return {
          name: userData?.name_user,
          email: userData?.email_user,
          phone: userData?.phone,
          is_active: userData?.is_active,
          cnh: driver.cnh,
          validade_cnh: driver.validade_cnh,
          categoria_cnh: driver.categoria_cnh,
        };
      });

      return res.status(200).json(formattedDrivers);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
