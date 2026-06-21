import express from "express";
import multer from "multer";
import { invoicesController } from "@/controllers/invoicesController";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/xml",
      "text/xml",
      "application/octet-stream", // alguns dispositivos enviam assim
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, true); // aceita tudo por agora, valida no controller
    }
  },
});
const router = express.Router();

// No authMiddleware here — already applied in index.ts

router.get("/", invoicesController.findAll);

router.get("/:id", invoicesController.findById);
router.post("/", invoicesController.create);
router.put("/:id", invoicesController.update);
router.delete("/:id", invoicesController.delete);

router.get("/nfe/:nfe", invoicesController.findByNfe);
router.get("/barcode/:barcode", invoicesController.findByBarcode);

router.post(
  "/xml",
  upload.single("xml"),
  invoicesController.createFromXml.bind(invoicesController),
);

router.post(
  "/:id/comprovante",
  upload.single("comprovante"),
  invoicesController.uploadComprovante,
);
export default router;
