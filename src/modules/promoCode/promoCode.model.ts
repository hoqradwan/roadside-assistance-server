import mongoose, { Schema, Model } from "mongoose";
import { IPromoCode } from "./promoCode.interface";

const promoCodeSchema: Schema<IPromoCode> = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "used"],
      default: "new",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    subscription: {
      type: String,
      default: "gym trainee",
    },
    expiryDate: {
      type: Date, // Store the name of the promo code
      default: null, // Default value will be an empty string
    },
    activeDate: {
      type: Date, // Store the name of the promo code
      default: null, // Default value will be an empty string
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

export const PromoCodeModel: Model<IPromoCode> =
  mongoose.models.PromoCode ||
  mongoose.model<IPromoCode>("PromoCode", promoCodeSchema);
