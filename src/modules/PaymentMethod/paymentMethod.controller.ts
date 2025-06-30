import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import PaymentMethod from "./paymentMethod.model";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { createPaymentMethodIntoDB, getAllPaymentMethodsFromDB } from "./paymentMethod.service";
import { CustomRequest } from "../../utils/customRequest";

export const createPaymentMethod = catchAsync(async(req:CustomRequest,res:Response)=>{
    const {id : userId} = req.user;
    const result = await createPaymentMethodIntoDB(userId,req.body);
    sendResponse(res,{
        statusCode : httpStatus.CREATED,
        success : true,
        message : "payment method created successfully",
        data : result
    })
})
export const getAllPaymentMethods = catchAsync(async(req:CustomRequest,res:Response)=>{
        const {id : userId} = req.user;

    const result = await getAllPaymentMethodsFromDB(userId);
    sendResponse(res,{
        statusCode : httpStatus.CREATED,
        success : true,
        message : "payment methods retrieved successfully",
        data : result
    })
})