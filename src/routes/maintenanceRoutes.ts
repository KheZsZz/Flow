import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";
import { maintenanceController } from "@/controllers/maintenanceController";

const router = Router();

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
