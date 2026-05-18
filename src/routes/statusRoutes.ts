import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { statusControllerInstance } from "@/controllers/statusController";

const router = express.Router();

router.post("/", statusControllerInstance.create);
router.get("/", statusControllerInstance.findAll);
router.put("/:id", statusControllerInstance.update);
router.delete("/:id", statusControllerInstance.delete);

export default router;
