import { Request, Response, NextFunction } from "express";
import { supabase } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import { statusSchema, StatusTypes } from "@/schemas/statusSchema";

class statusController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const statusData = statusSchema.parse({
        ...req.body,
        corporation_id: req.company?.id,
        created_by: req.user?.id,
      });

      if (!req.company?.id || !req.user?.id) {
        return res
          .status(400)
          .json({ error: "Missing company or user context in request" });
      }

      const { data, error } = await supabase
        .from("status")
        .insert({ ...statusData })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        message: "Status created successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabase
        .from("status")
        .select("id, code, name, description")
        .eq("corporation_id", req.company?.id)
        .order("code", { ascending: true });

      if (error) throw error;

      return res.status(200).json(data || []);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const statusUpdate = statusSchema.parse({
        ...req.body,
        updated_at: new Date().toISOString(),
      });

      if (!req.company?.id) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabase
        .from("status")
        .update({ ...statusUpdate })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        message: "Status updated successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!req.company?.id) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { error, count } = await supabase
        .from("Status")
        .delete({ count: "exact" })
        .eq("id", id)
        .eq("corporation_id", req.company?.id);

      if (error) throw error;

      return res.status(200).json({ message: "Status deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async findByCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;

      if (!req.company?.id) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabase
        .from("status")
        .select()
        .eq("code", code)
        .eq("corporation_id", req.company?.id)
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!req.company?.id) {
        return res
          .status(400)
          .json({ error: "Company context not found in request" });
      }

      const { data, error } = await supabase
        .from("status")
        .select()
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const statusControllerInstance = new statusController();
