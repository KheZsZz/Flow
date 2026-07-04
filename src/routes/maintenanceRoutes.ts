import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";
import {
  maintenanceController,
  maintenanceTypesController,
} from "@/controllers/maintenanceController";

const router = Router();

router.get(
  "/types",
  authMiddleware.requireRole("Requestor"),
  maintenanceTypesController.list,
);
router.post(
  "/types",
  authMiddleware.requireRole("Requestor"),
  maintenanceTypesController.create,
);
router.patch(
  "/types/:id",
  authMiddleware.requireRole("Requestor"),
  maintenanceTypesController.disable,
);

// ── Manutenções ──
router.get(
  "/",
  authMiddleware.requireRole("Requestor"),
  maintenanceController.findAll,
);
router.post(
  "/",
  authMiddleware.requireRole("Requestor"),
  maintenanceController.create,
);
router.put(
  "/:id",
  authMiddleware.requireRole("Requestor"),
  maintenanceController.update,
);
router.patch(
  "/:id",
  authMiddleware.requireRole("Requestor"),
  maintenanceController.disable,
);

export default router;
