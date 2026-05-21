import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";

import authRoutes from "@/routes/authRoutes";
import corporateRoutes from "@/routes/corporateRoutes";
import userRoutes from "@/routes/userRoutes";
import vehicleRoutes from "@/routes/vehicleRoutes";
import addressRoutes from "@/routes/addressRoutes";
import statusRoutes from "@/routes/statusRoutes";


const router = Router();

router.use("/auth", authRoutes);

router.use("/address", addressRoutes);

router.use("/corporate", corporateRoutes);

router.use(
  "/users",
  userRoutes
);
router.use(
  "/vehicle",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  vehicleRoutes
);

router.use(
  "/status",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  authMiddleware.isAdmin,
  statusRoutes,
);

export default router;
