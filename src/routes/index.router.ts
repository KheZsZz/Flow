import { Router } from "express";
import { authMiddleware } from "@/middleware/auth";

import corporateRoutes from "@/routes/corporateRoutes";
import userRoutes from "@/routes/userRoutes";
import vehicleRoutes from "@/routes/vehicleRoutes";
import addressRoutes from "@/routes/addressRoutes";

export const router = Router();

router.use("/address", addressRoutes);
router.use(corporateRoutes);
router.use(userRoutes, authMiddleware.authUser, authMiddleware.reqCompany);
router.use(vehicleRoutes, authMiddleware.authUser, authMiddleware.reqCompany);

export default router;
