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

  getUserToMechanicDistance,
  setUserLocation,
  getNearbyMechanics,
  getProfile,
  updateProfile,
  getSingleUser,
  getAllMechanics,
} from "./user.controller";
import upload from "../../middlewares/fileUploadNormal";
import { adminMiddleware } from "../../middlewares/auth";
import { get, set } from "mongoose";

const router = express.Router();
router.post(
  "/register",

  registerUser,
);
router.post("/login", loginUser);
// router.post("/admin-login", adminloginUser);
// router.post("/mechanic-login", mechanicloginUser);
router.post("/forget-password", forgotPassword);
router.post("/reset-password", adminMiddleware("user","mechanic"), resetPassword);
router.post("/verify-otp", verifyOTP);
router.post("/resend", resendOTP);
router.post("/verify-forget-otp", verifyForgotPasswordOTP);
router.post("/change-password", changePassword);
router.post("/update", upload.single("image"), updateUser);
router.post(
  "/updateProfile",  // POST request to update the profile
  adminMiddleware("user","mechanic","admin"),  // Admin middleware (authentication/authorization)
  upload.fields([
    { name: "image", maxCount: 1 },  // Allow 1 image file
     // Allow 1 driver license file
  ]),
  updateProfile  // Controller to update the user profile after file upload
);
router.get("/my-profile", getSelfInfo);
router.get("/profile",adminMiddleware("admin","user","mechanic"), getProfile);

router.get("/details/:userId",adminMiddleware("admin"),getSingleUser);
// router.get("/profile", adminMiddleware("admin","user","mechanic") getProfile);
router.get("/all", adminMiddleware("admin"), getAllUsers);
router.get("/mechanic/all", adminMiddleware("admin"), getAllMechanics);
router.get("/:userId/:mechanicId", getUserToMechanicDistance);
router.get("/nearby-mechanics", adminMiddleware("user","mechanic"), getNearbyMechanics);
router.post("/block-user", adminMiddleware("admin"), BlockUser);
router.post("/set-location", adminMiddleware("user","mechanic"), setUserLocation);
router.post("/delete", adminMiddleware("admin"), deleteUser);

export const UserRoutes = router;
