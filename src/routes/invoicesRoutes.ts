import express from "express";
import multer from "multer";
import { invoicesController } from "@/controllers/invoicesController";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// No authMiddleware here — already applied in index.ts

router.get("/", invoicesController.findAll);
router.get("/nfe/:nfe", invoicesController.findByNfe);
router.post(
  "/xml",
  upload.single("xml"),
  invoicesController.createFromXml.bind(invoicesController),
);
router.get("/:id", invoicesController.findById);
router.post("/", invoicesController.create);
router.put("/:id", invoicesController.update);
router.delete("/:id", invoicesController.delete);

export default router;
