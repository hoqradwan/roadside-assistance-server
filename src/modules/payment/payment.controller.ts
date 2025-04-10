import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import httpStatus from "http-status";
import { JWT_SECRET_KEY, STRIPE_SECRET_KEY } from "../../config";
import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import { UserModel } from "../user/user.model";
import sendResponse from "../../utils/sendResponse";
import { PaymentModel } from "./payment.model";
import { getAllPaymentFromDB } from "./payment.service";
import { format, formatDate } from "date-fns";
import { PromoCodeModel } from "../promoCode/promoCode.model";

export const paymentCreate = catchAsync(async (req: Request, res: Response) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, httpStatus.UNAUTHORIZED, {
        message: "No token provided or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1]; // Get the token part from the 'Bearer <token>'
    const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
      id: string;
    };
    const userId = decoded.id; // Assuming the token contains the userId

    const { subscriptionId, amount, transactionId } = req.body; // Accept amount and subscriptionId from body

    if (!transactionId) {
      return sendError(res, httpStatus.UNAUTHORIZED, {
        message: "Failed to purchase!",
      });
    }

    // Fetch the user by ID
    const user = await UserModel.findById(userId);
    if (!user) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "User not found.",
      });
    }

    // Store the expiry date in both the PaymentModel and UserModel
    const paymentData = {
      transactionId,
      userId: user._id,
      amount, // Payment amount
      date: new Date(),
      paymentData: {}, // You may want to include actual payment data here
      status: "completed",
      isDeleted: false,
    };

    // Create the payment record
    const newPayment = await PaymentModel.create(paymentData);

   
  
    // Send success response with the formatted expiry date
    return sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Payment completed successfully!",
      data:newPayment,
      pagination: undefined,
    });
  } catch (error) {
    console.error("Error during payment processing:", error);
    return sendError(res, httpStatus.INTERNAL_SERVER_ERROR, {
      message: "Internal server error",
    });
  }
});

export const getAllPayment = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const name = req.query.name as string;
  const date = req.query.date as string;

  const result = await getAllPaymentFromDB(
    page,
    limit,
    name,
    date,
  );

  if (result.data.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "No purchased history",
      data: {
        payments: [],
      },
      pagination: {
        totalPage: Math.ceil(result.total / limit),
        currentPage: page,
        prevPage: page > 1 ? page - 1 : 1,
        nextPage: result.data.length === limit ? page + 1 : page,
        limit,
        totalItem: result.total,
      },
    });
  }
  //console.log(result.data,"finding date")
  const formattedPayments = result.data.map((payment) => ({
    transactionId: payment.transactionId,
    amount: payment.amount,
    userName: payment.userName,
    date: format(new Date(payment.createdAt), "do MMMM, yyyy"), // Format the date using date-fns
  }));

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully.",
    data: {
      payments: formattedPayments,
    },
    pagination: {
      totalPage: Math.ceil(result.total / limit),
      currentPage: page,
      prevPage: page > 1 ? page - 1 : 1,
      nextPage: result.data.length === limit ? page + 1 : page,
      limit,
      totalItem: result.total,
    },
  });
});
