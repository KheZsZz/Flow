import { Router } from "express";
import { invoicesController } from "@/controllers/invoicesController";
import multer from "multer";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5mb
});

router.post("/nfe", invoicesController.create);
router.put("/nfe/:id", invoicesController.update);
router.delete("/nfe/:id", invoicesController.delete);
router.get("/nfe", invoicesController.findAll);
router.get("/nfe/:code", invoicesController.findByNfe);

// usar campo xml na requisição
router.post("/nfe/xml", upload.single("xml"), invoicesController.createFromXML);

export default router;