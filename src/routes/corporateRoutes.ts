import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { corporateController } from "@/controllers/corporateController";

const router = express.Router();

router.post(
  "/",
  authMiddleware.requireRole("Manager"),
  corporateController.create,
);
router.put(
  "/:id",
  authMiddleware.requireRole("Manager"),
  corporateController.update,
);
router.get("/:id", corporateController.findById);

export default router;
