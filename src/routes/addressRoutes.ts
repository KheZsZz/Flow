import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { addressController } from "@/controllers/addressController";

const router = express.Router();

router.post("/", addressController.create);
router.put("/:id", addressController.update);
router.delete("/:id", addressController.delete);

export default router;
