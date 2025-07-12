import express from "express";
import { adminMiddleware } from "../../middlewares/auth";
import { getAllPayment, paymentCreate } from "./payment.controller";

const router = express.Router();

router.post("/", adminMiddleware("user", "mechanic"), paymentCreate);
router.get("/history", adminMiddleware("user", "mechanic", "admin"), getAllPayment);

export const paymentRoutes = router;
