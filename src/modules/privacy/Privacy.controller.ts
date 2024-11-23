import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import sendError from "../../utils/sendError";
import {
  createPrivacyInDB,
  getAllPrivacyFromDB,
  updatePrivacyInDB,
} from "./Privacy.service";
import sendResponse from "../../utils/sendResponse";
import { findUserById } from "../user/user.service";
import catchAsync from "../../utils/catchAsync";

import sanitizeHtml from "sanitize-html";
import { JWT_SECRET_KEY } from "../../config";
import { Request, Response } from "express";

const sanitizeOptions = {
  allowedTags: [
    "b",
    "i",
    "em",
    "strong",
    "a",
    "p",
    "br",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "code",
    "pre",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target"],
    img: ["src", "alt"],
  },
  allowedIframeHostnames: ["www.youtube.com"],
};

export const createPrivacy = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as { id: string };
  const userId = decoded.id; // Assuming the token contains the userId

  // Find the user by userId
  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "User not found.",
    });
  }

  // Check if the user is an admin
  if (user.role !== "admin") {
    return sendError(res, httpStatus.FORBIDDEN, {
      message: "Only admins can create terms.",
    });
  }

  const { description } = req.body;
  const sanitizedContent = sanitizeHtml(description, sanitizeOptions);
  if (!description) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Description is required!",
    });
  }

  const result = await createPrivacyInDB({ sanitizedContent });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Privacy created successfully.",
    data: result,
  });
});

export const getAllPrivacy = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllPrivacyFromDB();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Privacy retrieved successfully.",
    data: result,
  });
});

export const updatePrivacy = catchAsync(async (req: Request, res: Response) => {
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
      message: "User not found.",
    });
  }

  // Check if the user is an admin
  if (user.role !== "admin") {
    return sendError(res, httpStatus.FORBIDDEN, {
      message: "Only admins can update privacy.",
    });
  }

  // Sanitize the description field
  const { description } = req.body;

  if (!description) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Description is required.",
    });
  }

  const sanitizedDescription = sanitizeHtml(description, sanitizeOptions);

  // Assume you're updating the terms based on the sanitized description
  const result = await updatePrivacyInDB(sanitizedDescription);

  if (!result) {
    return sendError(res, httpStatus.INTERNAL_SERVER_ERROR, {
      message: "Failed to update privacy.",
    });
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Privacy updated successfully.",
    data: result,
  });
});
