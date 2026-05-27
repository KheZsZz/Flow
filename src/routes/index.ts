import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";

import authRoutes from "@/routes/authRoutes";
import corporateRoutes from "@/routes/corporateRoutes";
import userRoutes from "@/routes/userRoutes";
import vehicleRoutes from "@/routes/vehicleRoutes";
import addressRoutes from "@/routes/addressRoutes";
import statusRoutes from "@/routes/statusRoutes";
import driverRoutes from "@/routes/driversRoutes";
import fuelRoutes from "@/routes/fuelRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/corporate", corporateRoutes);

router.use(
  "/address",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  addressRoutes,
);

router.use(
  "/drivers",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  driverRoutes,
);

router.use(
  "/vehicles",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  vehicleRoutes,
);

router.use(
  "/status",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  statusRoutes,
);

router.use(
  "/fuel",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  fuelRoutes,
);

export default router;
