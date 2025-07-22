import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import { createWithdrawIntoDB, getAllWithdrawRequestsByMechanic, getAllWithdrawRequestsForAdminFromDB, getAllWithdrawRequestsFromDB, markAsPaidIntoDB } from "./withdraw.service";

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
    const { mechanicId } = req.params;
    const result = await markAsPaidIntoDB(mechanicId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request accepted successfully",
        data: result
    })
});
export const getAllWithdrawRequests = catchAsync(async (req: CustomRequest, res: Response) => {
    const result = await getAllWithdrawRequestsFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request retrieved successfully",
        data: result
    })
});
export const getAllWithdrawRequestsForAdmin = catchAsync(async (req: CustomRequest, res: Response) => {
    const result = await getAllWithdrawRequestsForAdminFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request for admin retrieved successfully",
        data: result
    })
});
export const allWithdrawRequests = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: mechanicId } = req.user;
    const result = await getAllWithdrawRequestsByMechanic(mechanicId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request by mechanic retrieved successfully",
        data: result
    })
});