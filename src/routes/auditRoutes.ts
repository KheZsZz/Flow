import { Router } from "express";
import { auditController } from "@/controllers/auditController";

// authUser, reqCompany e requireRole("Admin") são aplicados no index.ts
const router = Router();

router.get("/", auditController.findAll);

export default router;
