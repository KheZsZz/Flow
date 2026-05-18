import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { corporateController } from "@/controllers/corporateController";

const router = express.Router();

router.post("/", corporateController.create);
router.put("/:id", corporateController.update);

export default router;
