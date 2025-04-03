import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createReviewIntoDB, getReviewByMechanicFromDB, getReviewsFromDB } from "./review.service";
import { CustomRequest } from "../../utils/customRequest";
import { Response } from "express";

export const createReview = catchAsync(async (req: CustomRequest, res: Response) => {
    const reviewData = req.body;
    const { id: userId } = req.user
    const result = await createReviewIntoDB(reviewData, userId);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Review created successfully",
        data: result
    })
})
export const getReviews = catchAsync(async (req, res) => {
    const result = await getReviewsFromDB();
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Reviews retrieved successfully",
        data: result
    })
})
export const getReviewByMechanic = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: mechanicId } = req.user
    const result = await getReviewByMechanicFromDB(mechanicId);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Reviews by mechanic retrieved successfully",
        data: result
    })
})