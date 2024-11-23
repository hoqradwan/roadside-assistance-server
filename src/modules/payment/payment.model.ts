import mongoose, { Schema, Model } from "mongoose";
import { IPayment } from "./payment.interface"; // Adjust the import path as necessary

const paymentSchema: Schema<IPayment> = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User", // Adjust the ref according to your user model
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Subscription", // Adjust the ref according to your subscription model
    },
    amount: {
      type: Number,
      required: true,
    },

    paymentData: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

export const PaymentModel: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
