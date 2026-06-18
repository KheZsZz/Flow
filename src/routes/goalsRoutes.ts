import { Router } from "express";
import { goalsController } from "@/controllers/goalsController";

// authUser, reqCompany e requireRole("Admin") são aplicados no index.ts
const router = Router();

router.get("/", goalsController.findAll);
router.post("/", goalsController.create);
router.patch("/:id", goalsController.update);
router.delete("/:id", goalsController.delete);

export default router;
