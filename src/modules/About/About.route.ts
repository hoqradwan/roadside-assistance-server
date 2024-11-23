import express from "express";

import { adminMiddleware } from "../../middlewares/auth";
import { createAbout, getAllAbout, updateAbout } from "./About.controller";

const router = express.Router();
router.post("/create", adminMiddleware("admin"), createAbout);
router.get("/", getAllAbout);
router.post("/update", updateAbout);

export const AboutRoutes = router;
