import express from "express";
import { adminMiddleware } from "../../middlewares/auth";
import {
  createPromoCode,
  deletePromoCode,
  getPromoCode,
  restorePromoCode,
  updatePromoCode,
  usePromoCode,
} from "./promoCode.controller";

const router = express.Router();

router.post("/create", adminMiddleware("admin"), createPromoCode);
router.get("/", adminMiddleware("admin"), getPromoCode);
router.post("/update", adminMiddleware("admin"), updatePromoCode);
router.post("/delete", adminMiddleware("admin"), deletePromoCode);
router.post("/restore", adminMiddleware("admin"), restorePromoCode);
router.post("/use-cupon", adminMiddleware("user"), usePromoCode);

export const promoCodeRoutes = router;
