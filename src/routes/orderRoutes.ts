import express from "express";
import multer from "multer";
const uploadCanhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

import { orderReceiptsController } from "@/controllers/orderReceiptsController";
import { ordersController } from "@/controllers/orderController";
import { orderItemsController } from "@/controllers/orderItemController";
import { trackingEventsController } from "@/controllers/trackingEventsController";
// ...

const router = express.Router();

// -- Orders
router.post("/", ordersController.create);
router.get("/", ordersController.findAll);
router.get("/:id", ordersController.findById);
router.patch("/:id/status", ordersController.updateStatus);
router.delete("/:id", ordersController.delete);
router.patch("/items/:id/status", orderItemsController.updateStatus);
router.delete("/items/:id", orderItemsController.delete);
router.put("/:id", ordersController.update);
router.post("/:id/baixar", ordersController.baixar);
router.get("/items/:item_id/tracking", trackingEventsController.findByItem);
router.post("/:id/start", ordersController.start);
router.post("/:id/concluir", ordersController.concluir);
router.get("/items/:item_id/receipts", orderReceiptsController.findByItem);
router.post(
  "/items/:item_id/comprovante",
  uploadCanhoto.single("comprovante"),
  orderReceiptsController.uploadComprovante,
);
router.patch("/tracking-events/:event_id", trackingEventsController.update);

export default router;
