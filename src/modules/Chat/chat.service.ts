import httpStatus from "http-status";
import { IChatMessage } from "./chat.interface";
import colors from 'colors';

import { ChatMessage } from "./chat.model";
import { io } from "../../utils/socket";
import mongoose from "mongoose";
import { logger } from "../../logger/logger";
import { UserModel } from "../user/user.model";
export const sendMessageIntoDB = async (senderId: string, receiverId: string, message: string) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      throw new Error('Invalid user IDs');
    }

    const result = await ChatMessage.create({
      sender: senderId,
      receiver: receiverId,
      message,
      timestamp: new Date()
    });

    // Send to recipient if online
    io?.to(receiverId).emit('private-message', message);

    return result;
  } catch (error) {
    logger.error(colors.red(`Error in sendMessageToUser: ${error}`));
    throw error;
  }
};
// export const sendMessageIntoDB = async (payload : Partial<IChatMessage>) => {
//   // Create a new chat message and save to DB
//   const message = await ChatMessage.create(payload);
//   const messageEvent = `new-message-${payload.receiver}`;
//   if (typeof payload?.receiver === 'string') {
//     io?.emit(messageEvent, {
//       code: httpStatus.OK,
//       message: 'Message sent successfully',
//       data: message,
//     });
//     // io?.to(payload.receiver).emit(`new-message`, {
//     //   code: httpStatus.OK,
//     //   message: 'Message sent successfully',
//     //   data: message,
//     // });
//   }
//   return message;
// };

export const getChatHistoryFromDB = async (sender: string, receiver: string) => {
  // Get all messages between sender and receiver
  // Sort by timestamp in ascending order
  // Return the chat history
  const chats = await ChatMessage.find({
    $or: [
      { sender, receiver },
      { sender: receiver, receiver: sender }
    ]
  }).sort('timestamp');

  const senderImage = await UserModel.findById(sender).select("image");
  const receiverImage = await UserModel.findById(receiver).select("image");
  const chatsWithImages = chats.map(chat => {
    const chatObj = chat.toObject();
    return {
      ...chatObj,
      senderImage: senderImage?.image,
      receiverImage: receiverImage?.image
    };
  });
  return chatsWithImages;
};
