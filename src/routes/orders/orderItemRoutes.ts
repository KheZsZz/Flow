import express from 'express';
import { authMiddleware } from '@/middleware/auth';
import { orderItemsController } from '@/controllers/orders/orderItemController';

const router = express.Router();

router.get   ("/:order_id/items",orderItemsController.findByOrder);
router.post  ("/items", orderItemsController.create);
router.patch ("/items/:id/status",  orderItemsController.updateStatus);
router.delete("/items/:id", orderItemsController.delete);

export default router;