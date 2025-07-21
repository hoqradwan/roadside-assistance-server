import { Document, Types } from "mongoose";

export type IPayment = {
  transactionId: string;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  amount: number;
  paymentData: object;
  status: "completed" | "pending" | "failed";
  isDeleted: boolean;
  createdAt?: any; // <-- Add createdAt field
  updatedAt?: any; // <-- Add updatedAt field
} & Document;

export type IPaymentResult = {
  transactionId: string;
  amount: number;
  userName: string;
  createdAt: string;
};
