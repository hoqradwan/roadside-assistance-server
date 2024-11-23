import mongoose, { Schema, Model } from "mongoose";
import { IFeedback } from "./feedback.interface";

const feedbackSchema: Schema<IFeedback> = new mongoose.Schema(
  {
    heard: {
      type: String,
      required: true,
      trim: true,
    },
    enjoy: {
      type: String,
      enum: ["yes", "no"],
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    feedback: {
      type: String,
    },
    rating: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt timestamps
  },
);

export const FeedbackModel: Model<IFeedback> =
  mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", feedbackSchema);
