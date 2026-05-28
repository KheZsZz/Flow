import express from 'express';
import { authMiddleware } from '@/middleware/auth';
import { trackingEventsController } from '@/controllers/orders/TrackingEventsController';

const router = express.Router();


router.get   ("/items/:item_id/tracking", authMiddleware.authUser, authMiddleware.reqCompany, trackingEventsController.findByItem);
router.post  ("/tracking",              authMiddleware.authUser, authMiddleware.reqCompany, trackingEventsController.create);

export default router;