import { Router } from "express";
import { userController } from "@/controllers/userController";
import { authMiddleware } from "@/middleware/auth";

const router = Router();

router.post("/signin", userController.signIn);
router.post("/logout", authMiddleware.authUser, userController.signOut);
router.get(
  "/me",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.me,
);

router.put(
  "/change-password",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.changePassword,
);

export default router;
