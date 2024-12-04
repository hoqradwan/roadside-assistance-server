import express from "express";

import {
  loginUser,
  registerUser,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
  verifyForgotPasswordOTP,
  changePassword,
  updateUser,
  getSelfInfo,
  getAllUsers,
  BlockUser,
  deleteUser,
  adminloginUser,
} from "./user.controller";
import upload from "../../middlewares/fileUploadNormal";
import { adminMiddleware } from "../../middlewares/auth";

const router = express.Router();
router.post(
  "/register",

  registerUser,
);
router.post("/login", loginUser);
router.post("/admin-login", adminloginUser);
router.post("/forget-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
router.post("/resend", resendOTP);
router.post("/verify-forget-otp", verifyForgotPasswordOTP);
router.post("/change-password", changePassword);
router.post("/update", upload.single("image"), updateUser);

router.get("/my-profile", getSelfInfo);
router.get("/all-user", adminMiddleware("admin"), getAllUsers);
router.post("/block-user", adminMiddleware("admin"), BlockUser);

router.post("/delete", adminMiddleware("admin"), deleteUser);

export const UserRoutes = router;
