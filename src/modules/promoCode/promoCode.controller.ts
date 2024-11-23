import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import {
  findPromoCodeByCode,
  findPromoCodeById,
  promoCodeCreate,
  promoCodeDelete,
  promoCodeRestore,
  promoCodesList,
  promoCodeUpdate,
} from "./promoCode.service";
import { findUserById } from "../user/user.service";
import { PromoCodeModel } from "./promoCode.model";
import { UserModel } from "../user/user.model";
import { JWT_SECRET_KEY } from "../../config";

export const createPromoCode = catchAsync(
  async (req: Request, res: Response) => {
    const { code, duration } = req.body;

    const existingPromoCode = await findPromoCodeByCode(code);

    if (existingPromoCode) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Cupon code already exists",
      });
    }

    const promoCode = await promoCodeCreate({ code, duration });

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Cupon code created successfully",
      data: promoCode,
      pagination: undefined,
    });
  },
);

export const getPromoCode = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const date = req.query.date as string;
  const duration = req.query.duration as string;

  const { promoCodes, totalPromoCodes, totalPages } = await promoCodesList(
    page,
    limit,
    date,
    duration,
  );

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  if (promoCodes.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "No Cupon codes available.",
      data: [],
      pagination: {
        totalPage: totalPages,
        currentPage: page,
        prevPage: prevPage ?? 1,
        nextPage: nextPage ?? 1,
        limit,
        totalItem: totalPromoCodes,
      },
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cupon codes retrieved successfully",
    data: promoCodes,
    pagination: {
      totalPage: totalPages,
      currentPage: page,
      prevPage: prevPage ?? 1,
      nextPage: nextPage ?? 1,
      limit,
      totalItem: totalPromoCodes,
    },
  });
});

export const updatePromoCode = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.query?.id as string;
    const { code, duration } = req.body;

    const promoCode = await findPromoCodeById(id);

    if (!promoCode) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Cupon code not found.",
      });
    }

    const updateData: { code?: string; duration?: string } = {};
    if (code) updateData.code = code;
    if (duration) updateData.duration = duration;

    const updatedPromoCode = await promoCodeUpdate(id, updateData);

    if (updatedPromoCode) {
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Cupon code updated successfully",
        data: updatedPromoCode,
        pagination: undefined,
      });
    }
  },
);

export const deletePromoCode = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.query?.id as string;

    const promoCode = await findPromoCodeById(id);

    if (!promoCode) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Cupon code not found.",
      });
    }

    if (promoCode.isDeleted) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Cupon code is already deleted.",
      });
    }
    await promoCodeDelete(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Cupon deleted successfully",
      data: null,
    });
  },
);

export const restorePromoCode = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.query?.id as string;

    const promoCode = await findPromoCodeById(id);

    if (!promoCode) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Cupon code not found.",
      });
    }
    if (!promoCode.isDeleted) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "Cupon code is already restored.",
      });
    }

    await promoCodeRestore(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Cupon restore successfully",
      data: null,
    });
  },
);

// export const usePromoCode = catchAsync(async (req: Request, res: Response) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return sendError(res, httpStatus.UNAUTHORIZED, {
//       message: 'No token provided or invalid format.',
//     });
//   }

//   const token = authHeader.split(' ')[1];

//   // Decode the token to get the user ID
//   const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { id: string };
//   const userId = decoded.id;

//   // Find the user by userId
//   const user = await findUserById(userId);

//   if (!user) {
//     return sendError(res, httpStatus.NOT_FOUND, {
//       message: 'User not found.',
//     });
//   }

//   const { cuponCode } = req.body;

//   // Check if the promo code exists in the database
//   const existingPromoCode = await PromoCodeModel.findOne({ code: cuponCode });

//   if (!existingPromoCode) {
//     return sendError(res, httpStatus.BAD_REQUEST, {
//       message: 'Coupon code does not exist',
//     });
//   }

//   // Check if the promo code has already been used
//   if (existingPromoCode.status === 'used') {
//     return sendError(res, httpStatus.BAD_REQUEST, {
//       message: 'This coupon code has already been used by another user.',
//     });
//   }

//   // Parse the duration from the promo code
//   const numericDuration = parseInt(existingPromoCode.duration, 10); // Assuming duration is stored as a string number
//   const durationUnit = existingPromoCode.duration.includes('year') ? 'year' : 'month';

//   // Calculate the end date based on the current date and promo code's duration
//   const currentDate = new Date();
//   const endDate = new Date(currentDate);

//   if (durationUnit === 'year') {
//     endDate.setFullYear(currentDate.getFullYear() + numericDuration);
//   } else {
//     endDate.setMonth(currentDate.getMonth() + numericDuration);
//   }

//   // Format the end date as a readable string
//   const formattedEndDate = endDate.toLocaleDateString('en-US', {
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric',
//   });

//   // Add promo code to the user's document
//   const addUserPromo = await UserModel.findByIdAndUpdate(
//     userId,
//     { cuponCode: existingPromoCode.code },
//     { new: true }
//   );

//   // Update promo code status to 'used'
//   await PromoCodeModel.findByIdAndUpdate(
//     existingPromoCode._id,
//     { status: 'used', userId: userId },
//     { new: true }
//   );

//   // Create the message with the promo code and calculated expiration time
//   const text = `Congratulations, ${user.name}! You have successfully redeemed the coupon code "${cuponCode}". The coupon is valid until ${formattedEndDate}. Enjoy the benefits!`;

//   // Send success response
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: text,
//     data: addUserPromo,
//   });
// });

export const usePromoCode = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];

  // Decode the token to get the user ID
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
    id: string;
  };
  const userId = decoded.id;

  // Find the user by userId
  const user = await findUserById(userId);

  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "User not found.",
    });
  }

  const { cuponCode } = req.body;

  // Check if the promo code exists in the database
  const existingPromoCode = await PromoCodeModel.findOne({ code: cuponCode });

  if (!existingPromoCode) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Coupon code does not exist.",
    });
  }

  // Check if the promo code has already been used
  if (existingPromoCode.status === "used") {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "This coupon code has already been used by another user.",
    });
  }

  // Parse the duration from the promo code (stored in months)
  const numericDuration = parseInt(existingPromoCode.duration, 10); // Assuming duration is stored as a string number

  // Calculate the expiry date by adding the duration in months
  const currentDate = new Date();
  const expiryDate = new Date(currentDate);
  expiryDate.setMonth(currentDate.getMonth() + numericDuration);

  // If the day of expiry is invalid (e.g., Feb 31), it will roll over to the next valid day
  if (expiryDate.getDate() !== currentDate.getDate()) {
    expiryDate.setDate(0); // Adjust to the last valid day of the previous month
  }

  // Store the expiry date in the database as a Date object
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    {
      cuponCode: existingPromoCode.code,
      activeDate: new Date(),
      expiryDate: expiryDate, // Store the actual Date object in the user's document
    },
    { new: true },
  );

  // Format the expiry date as a readable string with "17th October 2025" format for the response
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

  // Update promo code status to 'used'
  await PromoCodeModel.findByIdAndUpdate(
    existingPromoCode._id,
    {
      status: "used",
      activeDate: new Date(),
      expiryDate: expiryDate,
      userId: userId,
    },
    { new: true },
  );

  // Create dynamic success message with the formatted expiry date for response
  const text = `Congratulations, ${user.name}! You have successfully redeemed the coupon code "${cuponCode}". The coupon is valid for ${numericDuration} month(s) and will expire on ${formattedExpiryDate}. Enjoy the benefits!`;

  // Send success response with the formatted expiry date
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: text,
    data: {
      ...updatedUser.toObject(),
      expiryDate,
    },
  });
});
