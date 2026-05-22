import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { vehicleController } from "@/controllers/vehicleController";

const router = express.Router();

router.post("/",authMiddleware.requireRole('Admin') ,vehicleController.create);
router.put("/:id", authMiddleware.requireRole('Admin'), vehicleController.update);
router.delete("/:id", authMiddleware.requireRole('Admin'), vehicleController.delete);
router.get("/:id", vehicleController.findById);
router.get("/", vehicleController.findAll);

export default router;
