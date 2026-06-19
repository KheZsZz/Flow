import express from "express";
import { collectionsController } from "@/controllers/collectionsController";

const router = express.Router();

router.get("/", collectionsController.findAll);
router.post("/", collectionsController.create);
router.get("/:id", collectionsController.findById);
router.put("/:id", collectionsController.update);
router.patch("/:id", collectionsController.disable);
router.delete("/:id", collectionsController.delete);

export default router;
