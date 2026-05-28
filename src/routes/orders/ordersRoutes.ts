import express from 'express';
import { authMiddleware } from '@/middleware/auth';
import { ordersController } from '@/controllers/orders/orderController';

const router = express.Router();

router.get   ("/",                      authMiddleware.authUser, authMiddleware.reqCompany, ordersController.findAll);
router.get   ("/:id",                   authMiddleware.authUser, authMiddleware.reqCompany, ordersController.findById);
router.post  ("/",                      authMiddleware.authUser, authMiddleware.reqCompany, ordersController.create);
router.patch ("/:id/status",            authMiddleware.authUser, authMiddleware.reqCompany, ordersController.updateStatus);
router.delete("/:id",                   authMiddleware.authUser, authMiddleware.reqCompany, ordersController.delete);


export default router;
