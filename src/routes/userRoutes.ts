import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { userController } from "@/controllers/userController";
import { upload } from "@/middleware/upload";

const router = express.Router();

router.post(
  "/",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.signUp,
);

// Self-service: o próprio usuário troca seu avatar (não exige Admin)
router.post(
  "/avatar",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  upload.single("avatar"),
  userController.uploadAvatar,
);

router.put(
  "/:id",
  authMiddleware.authUser,
  authMiddleware.requireRole("Admin"),
  authMiddleware.reqCompany,
  userController.update,
);
router.patch(
  "/:id",
  authMiddleware.authUser,
  authMiddleware.requireRole("Admin"),
  userController.toggleActive,
);
router.delete(
  "/:id",
  authMiddleware.authUser,
  authMiddleware.requireRole("Admin"),
  userController.delete,
);
router.get(
  "/:id",
  authMiddleware.authUser,
  authMiddleware.requireRole("Admin"),
  userController.findbyId,
);
router.get(
  "/",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  authMiddleware.requireRole("Admin"),
  userController.findAll,
);

router.get(
  "/me",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.me,
);

export default router;
