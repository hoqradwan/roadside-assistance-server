import { Socket } from "socket.io";
import { createChatSessionIntoDB, getChatHistoryFromDB, saveChatMessage } from "./chat.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

// Function to handle chat messages received from clients
export const handleChatMessage = async (socket: Socket, senderId: string, receiverId: string, message: string) => {
    console.log("Received message:", message);

    // Save the message to the database
    const savedMessage = await saveChatMessage(senderId, receiverId, message);

    // Emit the chat message to the receiver
    socket.emit(`chat::${receiverId}`, {
        senderId,
        message: savedMessage.message,
    });

    // Optionally, you can emit a response back to the sender
    socket.emit(`chat::${senderId}`, {
        senderId,
        message: savedMessage.message,
    });
};


export const getChatHistory = catchAsync(async (req: any, res: any) => {
    const { userId, otherUserId } = req.params;
    console.log("Get chat history for:", userId, otherUserId);

    // Fetch chat history from the database
    const chatHistory = await getChatHistoryFromDB(userId, otherUserId);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Chat history fetched successfully",
        data: chatHistory
    });
});


export const createChatSession = catchAsync(async (req: any, res: any) => {
    const { userId, receiverId } = req.body;
  
      // Create a new chat session using the service (if needed)
      const chatSession = await createChatSessionIntoDB(userId, receiverId);
      sendResponse(res, {
        statusCode: 200,    
        success: true,     
        message: "Chat session created successfully", 
        data: chatSession   
      })
});