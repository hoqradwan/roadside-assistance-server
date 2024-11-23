import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";
import { Request, Response } from "express";
import { findUserById } from "../user/user.service";
import { JWT_SECRET_KEY } from "../../config";
import jwt from "jsonwebtoken";
import { createFeedback, feedbackList } from "./feedback.service";

export const giveFeedback = catchAsync(async (req: Request, res: Response) => {
  const { heard, enjoy, rating, feedback } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as { id: string };
  const userId = decoded.id;

  // Find the user by userId
  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "This account does not exist.",
    });
  }

  // Convert userId (string) to Types.ObjectId

  if (Number(rating) > 5) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "rating must be 1 to 5",
    });
  }
  // Create feedback
  const name = user.name;
  const email = user.email;

  const addFeedback = await createFeedback({
    heard,
    enjoy,
    rating,
    feedback,
    name,
    email,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Feedback given successfully",
    data: addFeedback,
    pagination: undefined,
  });
});

export const getFeedback = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const date = req.query.date as string;
  const name = req.query.name as string;
  const email = req.query.email as string;

  const { feedbacks, totalFeedbacks, totalPages } = await feedbackList(
    page,
    limit,
    date,
    name,
    email,
  );

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  if (feedbacks.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "No feedbacks yet.",
      data: [],
      pagination: {
        totalPage: totalPages,
        currentPage: page,
        prevPage: prevPage ?? 1,
        nextPage: nextPage ?? 1,
        limit,
        totalItem: totalFeedbacks,
      },
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "all feedbacks retrieved successfully",
    data: feedbacks,
    pagination: {
      totalPage: totalPages,
      currentPage: page,
      prevPage: prevPage ?? 1,
      nextPage: nextPage ?? 1,
      limit,
      totalItem: totalFeedbacks,
    },
  });
});
