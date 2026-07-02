import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";
import {
  expenseTypesController,
  operationalExpensesController,
  administrativeExpensesController,
} from "@/controllers/expensesController";

const router = Router();

router.get("/types", expenseTypesController.findAll);
router.post(
  "/types",
  authMiddleware.requireRole("Financer"),
  expenseTypesController.create,
);
router.patch(
  "/types/:id",
  authMiddleware.requireRole("Financer"),
  expenseTypesController.disable,
);

router.get(
  "/operational",
  authMiddleware.requireRole("Commum"),
  operationalExpensesController.findAll,
);
router.post(
  "/operational",
  authMiddleware.requireRole("Commum"),
  operationalExpensesController.create,
);
router.put(
  "/operational/:id",
  authMiddleware.requireRole("Commum"),
  operationalExpensesController.update,
);
router.patch(
  "/operational/:id",
  authMiddleware.requireRole("Commum"),
  operationalExpensesController.disable,
);

router.get(
  "/administrative",
  authMiddleware.requireRole("Financer"),
  administrativeExpensesController.findAll,
);
router.post(
  "/administrative",
  authMiddleware.requireRole("Financer"),
  administrativeExpensesController.create,
);
router.put(
  "/administrative/:id",
  authMiddleware.requireRole("Financer"),
  administrativeExpensesController.update,
);
router.patch(
  "/administrative/:id",
  authMiddleware.requireRole("Financer"),
  administrativeExpensesController.disable,
);

export default router;
