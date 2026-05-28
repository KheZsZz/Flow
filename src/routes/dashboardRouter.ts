import express from "express";
import { metricController } from "@/controllers/metricController";

const router = express.Router();

// GET /api/fuel/metrics/summary?start_date=2026-01-01&end_date=2026-12-31
router.get("/summary",    metricController.getSummary);
router.get("/efficiency", metricController.getVehicleEfficiency);
router.get("/ranking",   metricController.getDriverRanking);

export default router;