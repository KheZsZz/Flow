import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { userController } from "@/controllers/userController";

const router = express.Router();

router.post("/",   
    authMiddleware.authUser,
    authMiddleware.reqCompany,
    userController.signUp
);

router.put("/:id", authMiddleware.authUser, authMiddleware.requireRole('Admin'), authMiddleware.reqCompany, userController.update);
router.delete("/:id", authMiddleware.authUser,authMiddleware.requireRole('Admin'), userController.disable);
router.get("/:id", authMiddleware.authUser,authMiddleware.requireRole('Admin'),userController.findbyId);
router.get("/drivers", authMiddleware.authUser,userController.findAllDrivers);

router.get("/", authMiddleware.authUser,authMiddleware.requireRole('Admin'), userController.findAll);

export default router;
