import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { statusControllerInstance } from "@/controllers/statusController";

const router = express.Router();

router.post("/",authMiddleware.requireRole('Requestor') ,statusControllerInstance.create);
router.get("/", statusControllerInstance.findAll);
router.put("/:id", authMiddleware.requireRole('Admin'), statusControllerInstance.update);
router.delete("/:id", authMiddleware.requireRole('Admin'), statusControllerInstance.delete);

export default router;
