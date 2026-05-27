import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { userController } from "@/controllers/userController";

const router = express.Router();

router.get(
  "/",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.findAllDrivers,
);
router.get(
  "/:id",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.findDrivesById,
);

export default router;
