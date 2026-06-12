import express from "express";
import { clientsController } from "@/controllers/clientsController";

const router = express.Router();

router.get("/", clientsController.findAll);
router.post("/", clientsController.create);
router.get("/document/:document", clientsController.findByDocument);
router.put("/:id", clientsController.update);
router.patch("/:id", clientsController.disable);

export default router;
