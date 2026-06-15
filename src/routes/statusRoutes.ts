import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { statusControllerInstance } from "@/controllers/statusController";

const router = express.Router();

router.post(
  "/",
  authMiddleware.requireRole("Admin"),
  statusControllerInstance.create,
);

router.get("/", statusControllerInstance.findAll);
router.get("/:id", statusControllerInstance.findById);

router.get("/code/:code", statusControllerInstance.findByCode);

router.put(
  "/:id",
  authMiddleware.requireRole("Admin"),
  statusControllerInstance.update,
);

router.delete(
  "/:id",
  authMiddleware.requireRole("Admin"),
  statusControllerInstance.delete,
);

export default router;
