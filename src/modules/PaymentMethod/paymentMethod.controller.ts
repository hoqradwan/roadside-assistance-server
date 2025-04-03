import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import PaymentMethod from "./paymentMethod.model";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { createPaymentMethodIntoDB, getAllPaymentMethodsFromDB } from "./paymentMethod.service";

export const createPaymentMethod = catchAsync(async(req:Request,res:Response)=>{
    const result = await createPaymentMethodIntoDB(req.body);
    sendResponse(res,{
        statusCode : httpStatus.CREATED,
        success : true,
        message : "payment method created successfully",
        data : result
    })
})
export const getAllPaymentMethods = catchAsync(async(req:Request,res:Response)=>{
    const result = await getAllPaymentMethodsFromDB();
    sendResponse(res,{
        statusCode : httpStatus.CREATED,
        success : true,
        message : "payment methods retrieved successfully",
        data : result
    })
})