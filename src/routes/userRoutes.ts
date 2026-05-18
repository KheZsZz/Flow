import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { userController } from "@/controllers/userController";

const router = express.Router();

router.post(
  "/",
  authMiddleware.authUser,
  authMiddleware.isAdmin,
  userController.create,
);

router.patch("/:id", userController.update);
router.delete("/:id", userController.disable);
router.get("/:id", userController.findbyId);
router.get("/drivers", userController.findAllDrivers);

router.get("/", authMiddleware.isAdmin, userController.findAll);

export default router;
