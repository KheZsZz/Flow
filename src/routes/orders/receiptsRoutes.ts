import express from 'express';
import { authMiddleware } from '@/middleware/auth';
import { orderReceiptsController } from '@/controllers/orders/OrderReceiptsController';

const router = express.Router();
router.get   ("/items/:item_id/receipts", orderReceiptsController.findByItem);
router.post  ("/receipts", orderReceiptsController.create);

export default router;