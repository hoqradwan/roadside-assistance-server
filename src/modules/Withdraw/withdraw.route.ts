import { Router } from 'express';
import { createWithdraw, markAsPaid, getAllWithdrawRequests, allWithdrawRequests } from './withdraw.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/withdraw-request',adminMiddleware("mechanic"), createWithdraw);
router.get('/mechanic',adminMiddleware("mechanic"), allWithdrawRequests);
router.post('/mark-paid/:mechanicId',adminMiddleware("admin"), markAsPaid);
router.get('/all',adminMiddleware("admin"), getAllWithdrawRequests);



export const withdrawRoutes =  router;