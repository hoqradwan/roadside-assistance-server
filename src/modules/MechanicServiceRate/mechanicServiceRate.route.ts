import express from "express";
import { adminMiddleware } from "../../middlewares/auth";
import {  getMechanicServiceRate, updateMechanicServiceRate } from "./mechanicServiceRate.controller";
import { get } from "mongoose";

const router = express.Router();

router.post("/",adminMiddleware("mechanic"), updateMechanicServiceRate);
router.get("/",adminMiddleware("mechanic"), getMechanicServiceRate);

export const MechanicServiceRateRoute = router;