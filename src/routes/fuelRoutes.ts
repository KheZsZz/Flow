import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";
import { fuelController } from "@/controllers/fuelController";
const router = Router();

router.post("/", fuelController.create);
router.put("/:id", fuelController.update);
router.delete("/:id", fuelController.delete);

router.get("/", authMiddleware.requireRole("Requestor"), fuelController.find);
router.get(
  "/plate/:plate",
  authMiddleware.requireRole("Requestor"),
  fuelController.findByPlate,
);

export default router;
