import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import { acceptWithdrawRequestIntoDB, getAdminWalletOverviewFromDB, getOverviewFromDB } from "./admin.service";

export const getOverview = catchAsync(async (req, res) => {
    const result = await getOverviewFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Admin dashboard overview retrieved successfully",
        data: result
    });
})
export const getAdminWalletOverview = catchAsync(async (req , res) => { 
   
    const result = await getAdminWalletOverviewFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Admin wallet overview retrieved successfully",
        data: result
    });
})
export const acceptWithdrawRequest = catchAsync(async (req, res) => {
    const {mechanicId} = req.params;
    const result = await acceptWithdrawRequestIntoDB(mechanicId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request accepted successfully",
        data: result
    });
})
