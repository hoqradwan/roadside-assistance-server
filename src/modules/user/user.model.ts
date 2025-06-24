import mongoose, { Schema } from "mongoose";
import { IPendingUser, IUser, IOTP } from "./user.interface";
import { generateUniqueId } from "../Order/order.utils";

const PendingUserSchema = new Schema<IPendingUser>(
  {
    email: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    confirmPassword: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["user", "admin","mechanic"],
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
    image : { type: String, default: "" },
    role: {
      type: String,
      enum: ["admin", "user", "mechanic"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active", // Default value set to active
    },
   
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  
    isDeleted: {
      type: Boolean,
      default: false,
    },

    uniqueUserId: {
      type: String,
      default: generateUniqueId,
    },
  },
  { timestamps: true },
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

UserSchema.index({ location: "2dsphere" });

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, trim: true },
  otp: { type: String, required: true, trim: true },
  expiresAt: { type: Date, required: true },
});

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
