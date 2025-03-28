import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import {  getWalletOverviewFromDB } from "./wallet.service";

export const getWalletOverview = catchAsync(async (req : CustomRequest, res: Response) => {
    const {id:mechanicId} = req.user;
    const result = await getWalletOverviewFromDB(mechanicId);
    sendResponse(res,{
        statusCode: 200,
        success: true,
        message: "Wallet overview retrieved successfully",
        data: result
    })
});