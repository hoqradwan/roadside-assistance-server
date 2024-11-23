import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import { SubscriptionModel } from "./subscription.model";
import sendError from "../../utils/sendError";
import catchAsync from "../../utils/catchAsync";
import { Request, Response } from "express";
import {
  findSubsById,
  subscriptionList,
  subsDelete,
  subsUpdate,
} from "./subscription.service";
import { JWT_SECRET_KEY } from "../../config";
import { PaymentModel } from "../payment/payment.model";
import jwt from "jsonwebtoken";
import { UserModel } from "../user/user.model";
import { PromoCodeModel } from "../promoCode/promoCode.model";

export const createSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { name, price, duration } = req.body;

    // Validate if duration and price are numbers
    if (isNaN(Number(duration))) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Give only a number of how many months you want",
      });
    }
    if (isNaN(Number(price))) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Give correct price",
      });
    }

    // Check for existing subscription based on the language-specific name
    const existingSubscription = await SubscriptionModel.findOne({
      $or: [
        // Case-insensitive search for English name
        { name: { $regex: new RegExp(`^${name}$`, "i") } }, // Case-insensitive search for Spanish name
      ],
    });

    if (existingSubscription) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Subscription with this name already exists",
      });
    }

    // Create the subscription
    const subscription = await SubscriptionModel.create({
      name, // Save the localized name
      price,
      duration,
    });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Subscription created successfully",
      data: subscription,
      pagination: undefined,
    });
  },
);

export const getSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const { subscriptions, totalSubscriptions, totalPages } =
      await subscriptionList(page, limit);

    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;

    if (subscriptions.length === 0) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: "No subscriptions available.",
        data: [],
        pagination: {
          totalPage: totalPages,
          currentPage: page,
          prevPage: prevPage ?? 1,
          nextPage: nextPage ?? 1,
          limit,
          totalItem: totalSubscriptions,
        },
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
      pagination: {
        totalPage: totalPages,
        currentPage: page,
        prevPage: prevPage ?? 1,
        nextPage: nextPage ?? 1,
        limit,
        totalItem: totalSubscriptions,
      },
    });
  },
);

export const updateSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.query?.id as string;

    const { name, price, duration } = req.body;

    // Validate if duration is a number
    if (duration) {
      if (isNaN(Number(duration))) {
        return sendError(res, httpStatus.BAD_REQUEST, {
          message: "Give only a number of how many months you want",
        });
      }
    }

    // Validate if price is a number
    if (price) {
      if (isNaN(Number(price))) {
        return sendError(res, httpStatus.BAD_REQUEST, {
          message: "Give correct price",
        });
      }
    }

    // Find subscription by ID
    const subscription = await findSubsById(id);

    if (!subscription) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Subscription not found.",
      });
    }

    // Prepare update data
    const updateData: { name?: string; duration?: string; price?: string } = {};
    if (name) updateData.name = name;
    if (duration) updateData.duration = duration;
    if (price) updateData.price = price;

    // Update subscription
    const updatedSubs = await subsUpdate(id, updateData);

    // Send success response
    if (updatedSubs) {
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Subscription updated successfully",
        data: updatedSubs,
        pagination: undefined,
      });
    }
  },
);

export const deleteSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.query?.id as string;

    // Find subscription by ID
    const subscription = await findSubsById(id);

    if (!subscription) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Subscription not found.",
      });
    }

    // Check if the subscription is already deleted
    if (subscription.isDeleted) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Subscription is already deleted.",
      });
    }

    // Delete subscription
    await subsDelete(id);

    // Send success response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription deleted successfully",
      data: null,
    });
  },
);

export const getUserSubscriptions = catchAsync(
  async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, httpStatus.UNAUTHORIZED, {
        message: "No token provided or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
      id: string;
    };
    const userId = decoded.id;
    const user = await UserModel.findById(userId);

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

    // Fetch payments and populate the 'subscriptionId' with the relevant fields
    const payments = await PaymentModel.find({ userId }).populate({
      path: "subscriptionId", // Assuming subscriptionId references the Subscription model
      select: "name price duration isDeleted createdAt updatedAt", // Specify the fields to populate
    });

    if (!payments || payments.length === 0) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "You have no subscriptions.",
      });
    }

    // Map over the payments and format the subscription durations
    const subscriptions = payments
      .map((payment) => {
        const subscription = payment.subscriptionId as any;

        // Check if subscriptionId exists before accessing its properties
        if (!subscription) {
          return null; // Skip this payment if subscription is null
        }

        const numericDuration = parseInt(subscription.duration, 10);

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

        let formattedDuration = "";
        if (numericDuration <= 12) {
          formattedDuration = `${numericDuration} ${numericDuration === 1 ? "month" : "months"}`;
        } else {
          const years = Math.floor(numericDuration / 12);
          const months = numericDuration % 12;
          formattedDuration = `${years} ${years > 1 ? "years" : "year"}`;
          if (months > 0) {
            formattedDuration += ` ${months} ${months > 1 ? "months" : "month"}`;
          }
        }

        // Calculate the end date based on payment.createdAt and subscription duration
        const paymentDate = new Date(payment.createdAt);
        const endDate = new Date(paymentDate);
        endDate.setMonth(paymentDate.getMonth() + numericDuration);

        const formattedEndDate = endDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Create the message with the subscription name and active period
        const text = `You have purchased the ${subscription.name.en} plan. The plan is active until ${formattedEndDate}.`;

        return {
          name: subscription.name,
          price: subscription.price,
          duration: formattedDuration,
          text, // Include the dynamic message in the response
          expiryDate: expiryDate,
        };
      })
      .filter((sub) => sub !== null); // Filter out any null subscriptions

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My subscriptions retrieved successfully.",
      data: subscriptions,
    });
  },
);
