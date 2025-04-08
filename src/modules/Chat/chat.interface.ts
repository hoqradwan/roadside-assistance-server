import { Types } from "mongoose";

export interface IChatMessage extends Document {
    sender: Types.ObjectId; 
    receiver: Types.ObjectId; 
    message: string; 
    timestamp: Date; 
  }