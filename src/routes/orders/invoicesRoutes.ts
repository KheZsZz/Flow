import express from "express";
import { authMiddleware } from "@/middleware/auth";
import { invoicesController} from "@/controllers/orders/invoicesController";

const router = express.Router();

// Invoices
router.get   ("/invoices",              authMiddleware.authUser, authMiddleware.reqCompany, invoicesController.findAll);
router.get   ("/invoices/nfe/:nfe",     authMiddleware.authUser, authMiddleware.reqCompany, invoicesController.findByNfe);
router.get   ("/invoices/:id",          authMiddleware.authUser, authMiddleware.reqCompany, invoicesController.findById);
router.post  ("/invoices",              authMiddleware.authUser, authMiddleware.reqCompany, invoicesController.create);
router.put   ("/invoices/:id",          authMiddleware.authUser, authMiddleware.reqCompany, invoicesController.update);
router.delete("/invoices/:id",          authMiddleware.authUser, authMiddleware.reqCompany, invoicesController.delete);


// usar campo xml na requisição
// router.post("/nfe/xml", upload.single("xml"), invoicesController.createFromXML);

export default router;
