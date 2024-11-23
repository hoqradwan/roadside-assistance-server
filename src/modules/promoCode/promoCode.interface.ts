import { Document, Types } from "mongoose";

// Define the TypeScript type for PromoCode
export type IPromoCode = {
  code: string;
  duration: string;
  status: "new" | "used";
  expiryDate: Date | null;
  activeDate: Date | null;
  userId?: Types.ObjectId; // Optional because it might not always be set
  isDeleted: boolean;
  subscription: string;
} & Document;
