import { Router } from "express";
import { alertsController } from "@/controllers/alertsController";

// authUser, reqCompany e requireRole("Admin") são aplicados no index.ts
const router = Router();

router.get("/documents", alertsController.documents);

export default router;
