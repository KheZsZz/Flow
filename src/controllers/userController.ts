import { Request, Response, NextFunction } from "Express";
import { supabase } from "@/congif/supabase";
import { userType } from "@/schemas/user";
import { UserProfileTypes } from "@/schemas/enum";
import { AuthRequest } from "@/types/auth";

export class UserController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    const {
      document_user,
      name_user,
      email_user,
      profile,
      password_user,
      profile,
    }: userType = req.body;

    const { data, error } = await supabase
      .from("users")
      .insert({
        document_user,
        name_user,
        email_user,
        profile,
        password_user,
        avatar_url,
        created_by,
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
    }: userType = req.body;
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
}
