import mongoose, { Schema } from "mongoose";
import { INotification } from "./notification.interface";

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminId: [{ type: Schema.Types.ObjectId, ref: "User" }],
    adminMsg: { type: String },
    userMsg: { type: String },
  },
  { timestamps: true },
);

export const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
