import { Document, Types } from "mongoose";

export type ISubscription = {
  name: string;
  price: string;
  duration: string;
  isDeleted: boolean;
} & Document;
