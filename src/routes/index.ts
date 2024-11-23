import express from "express";
import { UserRoutes } from "../modules/user/user.route";
import { TermsRoutes } from "../modules/Terms/Terms.route";
import { AboutRoutes } from "../modules/About/About.route";
import { PrivacyRoutes } from "../modules/privacy/Privacy.route";
import { NotificationRoutes } from "../modules/notifications/notification.route";
import { promoCodeRoutes } from "../modules/promoCode/promoCode.route";
import { feedBackRoutes } from "../modules/Feedback/feedback.route";
import { subscriptionRoutes } from "../modules/subscription/subscription.route";
import { paymentRoutes } from "../modules/payment/payment.route";

const router = express.Router();

router.use("/api/v1/user", UserRoutes);
router.use("/api/v1/terms", TermsRoutes);
router.use("/api/v1/about", AboutRoutes);
router.use("/api/v1/privacy", PrivacyRoutes);
router.use("/api/v1/notification", NotificationRoutes);
router.use("/api/v1/cupon-code", promoCodeRoutes);
router.use("/api/v1/feedback", feedBackRoutes);
router.use("/api/v1/subscription", subscriptionRoutes);
router.use("/api/v1/purchase", paymentRoutes);

export default router;
