import { Router } from 'express';
import { createWithdraw, markAsPaid, getAllWithdrawRequests } from './withdraw.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/withdraw-request',adminMiddleware("mechanic"), createWithdraw);
router.post('/mark-paid/:mechanicId',adminMiddleware("admin"), markAsPaid);
router.get('/all',adminMiddleware("admin"), getAllWithdrawRequests);



export const withdrawRoutes =  router;