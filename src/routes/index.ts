import express from "express";
import { authMiddleware } from "@/middleware/auth";

import authRoutes from "@/routes/authRoutes";
import corporateRoutes from "@/routes/corporateRoutes";
import userRoutes from "@/routes/userRoutes";
import vehicleRoutes from "@/routes/vehicleRoutes";
import addressRoutes from "@/routes/addressRoutes";
import statusRoutes from "@/routes/statusRoutes";
import driverRoutes from "@/routes/driversRoutes";
import fuelRoutes from "@/routes/fuelRoutes";
import dashboardRouter from "@/routes/dashboardRouter";
import invoiceRoutes from "@/routes/invoicesRoutes";
import orderRoutes from "@/routes/orderRoutes";
import clientsRoutes from "@/routes/clientsRoutes";
import collectionsRoutes from "@/routes/collectionsRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/corporate", corporateRoutes);

router.use(
  "/dashboard",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  authMiddleware.requireRole("Admin"),
  dashboardRouter,
);

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

router.use(
  "/invoices",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  invoiceRoutes,
);

router.use(
  "/orders",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  orderRoutes,
);

router.use(
  "/clients",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  clientsRoutes,
);

router.use(
  "/collections",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  collectionsRoutes,
);
export default router;
