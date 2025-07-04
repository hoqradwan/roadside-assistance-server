import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import { initializeTrackingIntoDB } from "./locationTracking.service";
import sendResponse from "../../utils/sendResponse";

export const initializeTracking = catchAsync(async(req:CustomRequest, res:Response)=>{
    const orderId = req.body;
    const {id : userId} = req.user;
    const {mechanicId} = req.params;
    const result = await initializeTrackingIntoDB(orderId, userId, mechanicId);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Location tracking initialized successfully",
        data: result
    })

})