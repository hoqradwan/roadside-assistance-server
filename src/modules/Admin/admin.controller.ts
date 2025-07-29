import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import { acceptWithdrawRequestIntoDB, getAdminWalletOverviewFromDB, getEarningsGraphChartFromDB, getOverviewFromDB } from "./admin.service";

export const getOverview = catchAsync(async (req, res) => {
    const result = await getOverviewFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Admin dashboard overview retrieved successfully",
        data: result
    });
})
export const getAdminWalletOverview = catchAsync(async (req, res) => {
    const result = await getAdminWalletOverviewFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Admin wallet overview retrieved successfully",
        data: result
    });
})
export const acceptWithdrawRequest = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const result = await acceptWithdrawRequestIntoDB(requestId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Withdraw request accepted successfully",
        data: result
    });
})
export const getEarningChart = catchAsync(async (req, res) => {
    const { period = 'monthly', year, month } = req.query;

    // Call the service function to get the earnings chart data
    const result = await getEarningsGraphChartFromDB(period as any, Number(year), Number(month));
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Earning chart retrieved successfully",
        data: result
    });
})
