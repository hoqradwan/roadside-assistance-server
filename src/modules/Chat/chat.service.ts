import { ChatMessage } from "./chat.model";

// Function to save the chat message to the database
export const saveChatMessage = async (senderId: string, receiverId: string, message: string) => {
  const newMessage = new ChatMessage({
    senderId,
    receiverId,
    message,
  });

  // Save the message to the database
  await newMessage.save();
  return newMessage;
};

export const getChatHistoryFromDB = async (userId: string, otherUserId: string) => {
    const chatHistory = await ChatMessage.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ timestamp: 1 }); // Sort messages by timestamp in ascending order
  
    return chatHistory;
  };
  export const createChatSessionIntoDB = async (userId: string, receiverId: string) => {
    // You can add logic here to create a session or initialize a conversation
    // For now, we will just return a mock session object
    const session = { sessionId: `${userId}-${receiverId}`, userId, receiverId };
    return session;
  };