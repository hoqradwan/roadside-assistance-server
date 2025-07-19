import { Router } from 'express';
import { createPaymentMethod, deletePaymentMethod, getAllPaymentMethods } from './paymentMethod.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();
router.post("/create", adminMiddleware("mechanic"), createPaymentMethod)
router.post("/:paymentMethodId", adminMiddleware("mechanic"), deletePaymentMethod)
router.get("/", adminMiddleware("mechanic"), getAllPaymentMethods)

export const PaymentMethodRoutes = router;