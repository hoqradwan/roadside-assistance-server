import { Router } from 'express';
import { createWithdraw, markAsPaid, getAllWithdrawRequests, allWithdrawRequests, getAllWithdrawRequestsForAdmin } from './withdraw.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/withdraw-request',adminMiddleware("mechanic"), createWithdraw);
router.get('/mechanic',adminMiddleware("mechanic"), allWithdrawRequests);
router.post('/mark-paid/:mechanicId',adminMiddleware("admin"), markAsPaid);
router.get('/all',adminMiddleware("admin"), getAllWithdrawRequests);
router.get('/admin/all',adminMiddleware("admin"), getAllWithdrawRequestsForAdmin);


export const withdrawRoutes =  router;