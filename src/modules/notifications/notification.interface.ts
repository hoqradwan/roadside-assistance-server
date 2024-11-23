import { Document, Types } from "mongoose";

// Define the INotification type
export type INotification = {
  userId: Types.ObjectId;
  adminId?: Types.ObjectId[]; // Optional array of ObjectId
  adminMsg: string;
  userMsg: string;
} & Document;
