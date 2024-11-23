import express from "express";
import { adminMiddleware } from "../../middlewares/auth";
import { getAllPayment, paymentCreate } from "./payment.controller";

const router = express.Router();

router.post("/", adminMiddleware("user"), paymentCreate);
router.get("/history", adminMiddleware("admin"), getAllPayment);

export const paymentRoutes = router;
