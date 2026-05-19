import { Router } from 'express';
import { userController } from '@/controllers/userController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.post('/singin', userController.signIn); 
router.post('/logout', authMiddleware.authUser, userController.signOut);

export default router;