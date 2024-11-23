import mongoose, { Document } from "mongoose";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import httpStatus from "http-status";
import stripe from "stripe";
import { emitNotification } from "../../utils/socket";
import { JWT_SECRET_KEY, STRIPE_SECRET_KEY } from "../../config";
import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import { UserModel } from "../user/user.model";
import sendResponse from "../../utils/sendResponse";
import { SubscriptionModel } from "../subscription/subscription.model";
import { PaymentModel } from "./payment.model";
import { getAllPaymentFromDB } from "./payment.service";
import { format, formatDate } from "date-fns";
import { PromoCodeModel } from "../promoCode/promoCode.model";
//const stripeInstance = stripe(STRIPE_SECRET_KEY);

// export const paymentCreate = catchAsync(async (req: Request, res: Response) => {
//     try {
//         // Extract the token from the Authorization header
//         const authHeader = req.headers.authorization;
//         if (!authHeader || !authHeader.startsWith('Bearer ')) {
//             return sendError(res, httpStatus.UNAUTHORIZED, {
//                 message: 'No token provided or invalid format.',
//             });
//         }

//         const token = authHeader.split(' ')[1]; // Get the token part from the 'Bearer <token>'

//         const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as { id: string };
//         const userId = decoded.id; // Assuming the token contains the userId

//         const { subscriptionId, amount, transactionId } = req.body; // Accept amount and subscriptionId from body
//        // console.log(req.body, "payment create");

//         if (!transactionId) {
//             return sendError(res, httpStatus.UNAUTHORIZED, {
//                 message: 'Failed to purchase!',
//             });
//         }

//         // Fetch the user by ID
//         const user = await UserModel.findById(userId);
//         if (!user) {
//             return sendError(res, httpStatus.NOT_FOUND, {
//                 message: 'User not found.',
//             });
//         }

//         // Check if the user already has a promo code
//         // if (user.cuponCode) {
//         //     return sendResponse(res, {
//         //         statusCode: httpStatus.OK,
//         //         success: true,
//         //         message: 'you have a cupon code.This app is free for you!',
//         //         data: null,
//         //         pagination: undefined,
//         //     });
//         // }
//         if (user.cuponCode) {
//             // Fetch the promo code details
//             const promoCode = await PromoCodeModel.findOne({ code: user.cuponCode });

//             // Calculate the duration from the promo code
//             const numericDuration = parseInt(promoCode?.duration || '0', 10);
//             const durationUnit = promoCode?.duration.includes('year') ? 'year' : 'month';

//             // Calculate the end date
//             const currentDate = new Date();
//             const endDate = new Date(currentDate);

//             if (durationUnit === 'year') {
//                 endDate.setFullYear(currentDate.getFullYear() + numericDuration);
//             } else {
//                 endDate.setMonth(currentDate.getMonth() + numericDuration);
//             }

//             // Format the end date as a readable string
//             const formattedEndDate = endDate.toLocaleDateString('en-US', {
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric',
//             });

//             // Dynamic message based on the duration
//             const message = `You have a coupon code. This app is free for you until ${formattedEndDate}!`;

//             return sendResponse(res, {
//                 statusCode: httpStatus.OK,
//                 success: true,
//                 message, // Use the dynamic message
//                 data: null,
//                 pagination: undefined,
//             });
//         }
//         // Validate subscriptionId
//         const subscription = await SubscriptionModel.findById(subscriptionId);
//         if (!subscription) {
//             return sendError(res, httpStatus.NOT_FOUND, {
//                 message: 'Subscription not found.',
//             });
//         }

//         // Create a new payment record
//         const paymentData = {
//             transactionId,
//             userId: user._id,
//             subscriptionId, // Store the subscription ID
//             amount, // Converting back to dollars
//             date: new Date(),
//             paymentData: {}, // You may want to include actual payment data here
//             status: 'completed',
//             isDeleted: false,
//         };

//         const newPayment = await PaymentModel.create(paymentData);

//         // Emit notifications after successful payment
//         await emitNotification({
//             userId: user._id,
//             userMsg: `You successfully purchased the subscription!`,
//             adminMsg: `${user.name} purchased a subscription with the transaction ID: "${transactionId}".`,
//         });

//         return sendResponse(res, {
//             statusCode: httpStatus.CREATED,
//             success: true,
//             message: 'Payment completed successfully!',
//             data: newPayment,
//             pagination: undefined,
//         });

//     } catch (error) {
//         console.error('Error during payment processing:', error);
//         return sendError(res, httpStatus.INTERNAL_SERVER_ERROR, {
//             message: `Internal server error`,
//         });
//     }
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
    if (user.cuponCode) {
      // Fetch the promo code details
      const promoCode = await PromoCodeModel.findOne({ code: user.cuponCode });

      // Calculate the duration from the promo code
      const numericDuration = parseInt(promoCode?.duration || "0", 10);
      const durationUnit = promoCode?.duration.includes("year")
        ? "year"
        : "month";

      // Calculate the end date
      const currentDate = new Date();
      const endDate = new Date(currentDate);

      if (durationUnit === "year") {
        endDate.setFullYear(currentDate.getFullYear() + numericDuration);
      } else {
        endDate.setMonth(currentDate.getMonth() + numericDuration);
      }

      // Format the end date as a readable string
      const formattedEndDate = endDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Dynamic message based on the duration
      const message = `You have a coupon code. This app is free for you until ${formattedEndDate}!`;

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message, // Use the dynamic message
        data: null,
        pagination: undefined,
      });
    }
    // Validate subscriptionId
    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Subscription not found.",
      });
    }

    // Ensure subscriptionDuration is a number
    const subscriptionDuration =
      typeof subscription.duration === "number"
        ? subscription.duration
        : parseInt(subscription.duration as string, 10) || 12;

    const currentDate = new Date();
    const expiryDate = new Date(currentDate);
    expiryDate.setMonth(currentDate.getMonth() + subscriptionDuration);

    // If the day of expiry is invalid (e.g., Feb 31), it will roll over to the next valid day
    if (expiryDate.getDate() !== currentDate.getDate()) {
      expiryDate.setDate(0); // Adjust to the last valid day of the previous month
    }

    // Store the expiry date in both the PaymentModel and UserModel
    const paymentData = {
      transactionId,
      userId: user._id,
      subscriptionId, // Store the subscription ID
      amount, // Payment amount
      date: new Date(),
      expiryDate: expiryDate, // Store the actual Date object for expiry in PaymentModel
      paymentData: {}, // You may want to include actual payment data here
      status: "completed",
      isDeleted: false,
    };

    // Create the payment record
    const newPayment = await PaymentModel.create(paymentData);

    // Update the user's expiry date in the UserModel
    await UserModel.findByIdAndUpdate(
      userId,
      {
        expiryDate: expiryDate, // Store the actual expiry date
        activeDate: new Date(), // Store the current date as activeDate
      },
      { new: true },
    );

    // Format the expiry date as a readable string for response
    const day = expiryDate.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
          ? "nd"
          : day % 10 === 3 && day !== 13
            ? "rd"
            : "th";
    const formattedExpiryDate = `${day}${suffix} ${expiryDate.toLocaleString("en-US", { month: "long" })} ${expiryDate.getFullYear()}`;

    // Emit notifications after successful payment
    await emitNotification({
      userId: user._id,
      userMsg: `You successfully purchased the subscription! It is valid until ${formattedExpiryDate}.`,

      adminMsg: `${user.name} purchased a  subscription with the transaction ID: "${transactionId}".`,
    });

    // Send success response with the formatted expiry date
    return sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Payment completed successfully!",
      data: {
        ...newPayment.toObject(),
        expiryDate: formattedExpiryDate, // Send the formatted expiry date in the response
      },
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
  const subscriptionName = req.query.subscriptionName as string;

  const result = await getAllPaymentFromDB(
    page,
    limit,
    name,
    date,
    subscriptionName,
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
    subscriptionName: payment.subscriptionName,
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
