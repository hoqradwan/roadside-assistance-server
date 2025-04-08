import httpStatus from "http-status";
import { IChatMessage } from "./chat.interface";
import { ChatMessage } from "./chat.model";
import { io } from "../../utils/socket";

export const sendMessageIntoDB = async (payload : Partial<IChatMessage>) => {
  // Create a new chat message and save to DB
  const message = await ChatMessage.create(payload);
  if (typeof payload?.receiver === 'string') {
  
    io?.to(payload.receiver).emit(`new-message`, {
      code: httpStatus.OK,
      message: 'Message sent successfully',
      data: message,
    });
  }
  return message;
};

 export const getChatHistoryFromDB = async (sender : string, receiver : string) => {
  // Get all messages between sender and receiver
  // Sort by timestamp in ascending order
  // Return the chat history
  return await ChatMessage.find({
    $or: [
      { sender, receiver },
      { sender: receiver, receiver: sender }
    ]
  }).sort('timestamp');
};
