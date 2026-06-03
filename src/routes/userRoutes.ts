import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { userController } from "@/controllers/userController";

const router = express.Router();

router.post(
  "/",
  authMiddleware.authUser,
  authMiddleware.reqCompany,
  userController.signUp,
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
  userController.disable,
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
