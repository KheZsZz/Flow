import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { addressController } from "@/controllers/addressController";

const router = express.Router();

router.get("/", authMiddleware.authUser, addressController.findAll);
// router.get("/:id", authMiddleware.authUser, addressController.findById);
router.get("/cep/:cep", authMiddleware.authUser, addressController.findByCep);
router.post("/", authMiddleware.authUser, addressController.create);
router.put("/:id", authMiddleware.authUser, addressController.update);
router.delete("/:id", authMiddleware.authUser, addressController.delete);

export default router;
