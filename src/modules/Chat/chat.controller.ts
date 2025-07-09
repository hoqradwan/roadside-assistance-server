import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { getChatHistoryFromDB, sendMessageIntoDB } from "./chat.service";
import { CustomRequest } from "../../utils/customRequest";
import { Response } from "express";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import mongoose from "mongoose";

export const getChatHistory = catchAsync(async (req: any, res: any) => {
    const { receiver } = req.params;
    const { id: userId } = req.user;

    if(receiver === userId ) {
      throw  new AppError(httpStatus.FORBIDDEN,"You cannnt chat with yourself");
    }
        
    // Fetch chat history from the database
    const chatHistory = await getChatHistoryFromDB(userId, receiver);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Chat history fetched successfully",
        data: chatHistory
    });
});

export const sendMessage = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: sender } = req.user;
    const { receiver, message } = req.body; // Changed from 'message' to 'content' to match the socket implementation
  
    // Validate receiver ID
    if (!mongoose.Types.ObjectId.isValid(receiver)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid recipient ID');
    }

    // Create and send message
    const result = await sendMessageIntoDB(sender, receiver, message);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Message sent successfully",
        data: result
    });
});
// export const sendMessage = catchAsync(async (req: CustomRequest, res: Response) => {
//     const { id: sender } = req.user;
//     const { receiver, message } = req.body;
  
//     const payload: Partial<IChatMessage> = {
//         sender,
//         receiver,
//         message,
//     }

//     // Create a new chat session using the service (if needed)
//     const chatSession = await sendMessageIntoDB(payload);
//     sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: "Message sent successfully",
//         data: chatSession
//     })
// });