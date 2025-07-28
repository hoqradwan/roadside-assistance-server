import { Document, Types } from "mongoose";

// Define the INotification type
export type INotification = {
  orderId?: Types.ObjectId; // Optional ObjectId for the order
  userId: Types.ObjectId;
  adminId?: Types.ObjectId[]; // Optional array of ObjectId
  adminMsg: string;
  userMsg: string;
} & Document;
