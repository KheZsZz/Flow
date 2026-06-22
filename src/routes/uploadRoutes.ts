import express from "express";
import { upload, uploadController } from "@/controllers/uploadController";

const router = express.Router();

router.post(
  "/:entity/:type",
  upload.single("file"),
  uploadController.uploadDocument,
);

export default router;
