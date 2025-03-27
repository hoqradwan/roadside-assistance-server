import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import { createWithdrawIntoDB, markAsPaidIntoDB } from "./withdraw.service";

export const createWithdraw = catchAsync(async (req: CustomRequest, res: Response) => {
    const { amount } = req.body;
    const { id } = req.user;
    const result = await createWithdrawIntoDB(amount, id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request created successfully",
        data: result
    })
});
export const markAsPaid = catchAsync(async (req: CustomRequest, res: Response) => {
    const {mechanicId} = req.params;
    const result = await markAsPaidIntoDB(mechanicId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request accepted successfully",
        data: result
    })
});