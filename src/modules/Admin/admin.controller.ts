import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { getOverviewFromDB } from "./admin.service";

export const getOverview = catchAsync(async (req, res) => {
    const result = await getOverviewFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Admin dashboard overview retrieved successfully",
        data: result
    });
})
