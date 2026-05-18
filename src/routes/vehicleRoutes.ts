import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { vehicleController } from "@/controllers/vehicleController";

const router = express.Router();

router.post("/", vehicleController.create);
router.put("/:id", vehicleController.update);
router.delete("/:id", vehicleController.delete);
router.get("/:id", vehicleController.findById);
router.get("/", vehicleController.findAll);

export default router;
