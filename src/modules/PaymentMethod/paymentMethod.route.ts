import { Router } from 'express';
import { createPaymentMethod, getAllPaymentMethods } from './paymentMethod.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();
router.post("/create", adminMiddleware("admin","mechanic"), createPaymentMethod)
router.get("/", adminMiddleware("mechanic"), getAllPaymentMethods)

export const PaymentMethodRoutes = router;