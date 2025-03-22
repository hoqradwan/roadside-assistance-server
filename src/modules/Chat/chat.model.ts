import { Schema, model, Document, Types } from "mongoose";

interface IChatMessage extends Document {
  senderId: Types.ObjectId; 
  receiverId: Types.ObjectId; 
  message: string; 
  timestamp: Date; 
}

const chatMessageSchema = new Schema<IChatMessage>({
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatMessage = model<IChatMessage>("ChatMessage", chatMessageSchema);

export { ChatMessage };
