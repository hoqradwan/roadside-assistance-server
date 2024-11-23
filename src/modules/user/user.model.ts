import mongoose, { Schema } from "mongoose";
import { IPendingUser, IUser, IOTP } from "./user.interface";

const PendingUserSchema = new Schema<IPendingUser>(
  {
    email: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    confirmPassword: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["user", "admin"],
    },
  },
  { timestamps: true },
);

export const PendingUserModel = mongoose.model<IPendingUser>(
  "PendingUser",
  PendingUserSchema,
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, trim: true },
    confirmPassword: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },

    image: {
      type: {
        publicFileURL: { type: String, trim: true },
        path: { type: String, trim: true },
      },
      required: false,
      default: {
        publicFileURL: "/images/user.png",
        path: "public\\images\\user.png",
      },
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: String,

      enum: ["active", "blocked"],
      default: "active", // Default value set to active
    },
    age: {
      type: String,
    },
    bio: {
      type: String,
    },
    about: {
      type: String,
    },
    gender: {
      type: String,
    },
    cuponCode: {
      type: String, // Store the name of the promo code
      default: "", // Default value will be an empty string
    },
    expiryDate: {
      type: Date, // Store the name of the promo code
      default: null, // Default value will be an empty string
    },
    activeDate: {
      type: Date, // Store the name of the promo code
      default: null, // Default value will be an empty string
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, trim: true },
  otp: { type: String, required: true, trim: true },
  expiresAt: { type: Date, required: true },
});

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
