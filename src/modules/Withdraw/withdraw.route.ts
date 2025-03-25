import { Router } from 'express';
import { createWithdraw } from './withdraw.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/withdraw',adminMiddleware("admin","mechanic"), createWithdraw);



export const withdrawRoutes =  router;