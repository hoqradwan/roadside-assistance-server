import { Router } from 'express';
import { createWithdraw, markAsPaid } from './withdraw.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/withdraw-request',adminMiddleware("mechanic"), createWithdraw);
router.post('/mark-paid/:mechanicId',adminMiddleware("admin"), markAsPaid);



export const withdrawRoutes =  router;