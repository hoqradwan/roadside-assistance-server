import express from "express";
import { getMyNotification } from "./notification.controller";
import { adminMiddleware } from "../../middlewares/auth";

const router = express.Router();

router.get("/", adminMiddleware("user","mechanic"), getMyNotification);

export const NotificationRoutes = router;
