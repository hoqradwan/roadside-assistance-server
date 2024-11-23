import express from "express";
import { getMyNotification } from "./notification.controller";

const router = express.Router();

router.get("/", getMyNotification);

export const NotificationRoutes = router;
