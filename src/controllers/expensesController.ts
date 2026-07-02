import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/config/supabase";
import { AuthRequest } from "@/middleware/auth";
import {
  operationalExpenseSchema,
  administrativeExpenseSchema,
  expenseTypeSchema,
} from "@/schemas/expensesSchema";

// ── Tipos de despesa (compartilhado entre as duas abas, filtrado por category) ──
class ExpenseTypesController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const data = expenseTypeSchema.parse(req.body);

      const { data: created, error } = await supabaseAdmin
        .from("expense_types")
        .insert({
          ...data,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Tipo de despesa criado", data: created });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const { category } = req.query;

      let query = supabaseAdmin
        .from("expense_types")
        .select("*")
        .eq("corporation_id", req.company.id)
        .eq("is_active", true)
        .order("name");

      if (category) query = query.eq("category", category as string);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("expense_types")
        .update({ is_active: false })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Tipo de despesa desativado", data });
    } catch (error) {
      next(error);
    }
  }
}

// ── Custos Operacionais ──
class OperationalExpensesController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const data = operationalExpenseSchema.parse(req.body);

      const { data: created, error } = await supabaseAdmin
        .from("operational_expenses")
        .insert({
          ...data,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select("*, expense_types(name, category), vehicles(license_plate)")
        .single();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Custo operacional lançado", data: created });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("operational_expenses")
        .select("*, expense_types(name, category), vehicles(license_plate)")
        .eq("corporation_id", req.company.id)
        .eq("is_active", true)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = operationalExpenseSchema.partial().parse(req.body);

      const { data: updated, error } = await supabaseAdmin
        .from("operational_expenses")
        .update(data)
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Custo operacional atualizado", data: updated });
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("operational_expenses")
        .update({ is_active: false })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Custo operacional removido", data });
    } catch (error) {
      next(error);
    }
  }
}

// ── Custos Administrativos ──
class AdministrativeExpensesController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id || !req.user?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const data = administrativeExpenseSchema.parse(req.body);

      const { data: created, error } = await supabaseAdmin
        .from("administrative_expenses")
        .insert({
          ...data,
          corporation_id: req.company.id,
          created_by: req.user.id,
        })
        .select("*, expense_types(name, category)")
        .single();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Custo administrativo lançado", data: created });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.company?.id) {
        return res.status(400).json({ message: "Company ID is required" });
      }
      const { data, error } = await supabaseAdmin
        .from("administrative_expenses")
        .select("*, expense_types(name, category)")
        .eq("corporation_id", req.company.id)
        .eq("is_active", true)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = administrativeExpenseSchema.partial().parse(req.body);

      const { data: updated, error } = await supabaseAdmin
        .from("administrative_expenses")
        .update(data)
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Custo administrativo atualizado", data: updated });
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("administrative_expenses")
        .update({ is_active: false })
        .eq("id", id)
        .eq("corporation_id", req.company?.id)
        .select()
        .single();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Custo administrativo removido", data });
    } catch (error) {
      next(error);
    }
  }
}

export const expenseTypesController = new ExpenseTypesController();
export const operationalExpensesController =
  new OperationalExpensesController();
export const administrativeExpensesController =
  new AdministrativeExpensesController();
