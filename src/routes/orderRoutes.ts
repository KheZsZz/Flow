import express from "express";

import { ordersController } from "@/controllers/orderController";
import { orderItemsController } from "@/controllers/orderItemController";

const router = express.Router();

// -- Orders
router.post("/", ordersController.create);
router.get("/", ordersController.findAll);
router.get("/:id", ordersController.findById);
router.patch("/:id/status", ordersController.updateStatus);
router.delete("/:id", ordersController.delete);

// -- item_order
router.patch("/items/:id/status", orderItemsController.updateStatus);
router.delete("/items/:id", orderItemsController.delete);

// -- Tracking
// router.get("/items/:item_id/tracking", trackingEventsController.findByItem);

// -- Comprovantes
// router.get("/items/:item_id/receipts", orderReceiptsController.findByItem);
// router.post("/receipts", orderReceiptsController.create);
//

router.put("/:id", ordersController.update);

router.post("/:id/baixar", ordersController.baixar);

export default router;
