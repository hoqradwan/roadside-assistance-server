import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {  getWalletOverviewFromDB } from "./wallet.service";

export const getWalletOverview = catchAsync(async (req, res) => {
    const result = await getWalletOverviewFromDB();
    sendResponse(res,{
        statusCode: 200,
        success: true,
        message: "Wallet overview retrieved successfully",
        data: result
    })
});