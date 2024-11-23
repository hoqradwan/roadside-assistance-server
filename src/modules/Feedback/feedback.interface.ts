import { Document, Types } from "mongoose";

export type IFeedback = {
  heard: string;
  enjoy: "yes" | "no";
  rating: string;
  feedback: string;
  name: string | undefined; // This is correct
  email: string | undefined; // This is correct

  isDeleted: boolean;
} & Document;
