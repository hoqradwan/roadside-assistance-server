import express from "express";
import { adminMiddleware } from "../../middlewares/auth";
import { createAbout, getAllAbout, testNotification, updateAbout } from "./About.controller";

const router = express.Router();
router.post("/create", adminMiddleware("admin"), createAbout);
router.get("/", getAllAbout);
router.post("/update", updateAbout);
router.post("/testNoti", adminMiddleware("admin","user"),testNotification);

export const AboutRoutes = router;
