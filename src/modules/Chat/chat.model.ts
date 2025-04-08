import { Schema, model, Document, Types } from "mongoose";
import { IChatMessage } from "./chat.interface";



const chatMessageSchema = new Schema<IChatMessage>({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
chatMessageSchema.index({ chatId: 1, createdAt: 1 });

const ChatMessage = model<IChatMessage>("ChatMessage", chatMessageSchema);

export { ChatMessage };
