import express from "express";
import { adminMiddleware } from "../../middlewares/auth";
import {  updateMechanicServiceRate } from "./mechanicServiceRate.controller";

const router = express.Router();

router.post("/",adminMiddleware("mechanic"), updateMechanicServiceRate);

export const MechanicServiceRateRoute = router;