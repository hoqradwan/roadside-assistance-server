import { ZodError } from "zod";
import { ErrorRequestHandler } from "express";
import { IErrorResponse } from "../interface/error";
import handlerZodError from "../errors/handleZodError";
import mongoose from "mongoose";
import handleValidationError from "../errors/handleValidationError";
import handlerCastError from "../errors/handleCastError";
import handlerDuplicateError from "../errors/handleDuplicateError";
import AppError from "../errors/AppError";
import { NODE_ENV } from "../config";

const globalErrorHandler: ErrorRequestHandler = (
  error: any,
  req: any,
  res: any,
  next: any,
) => {
  let errorInfo: IErrorResponse = {
    success: false,
    statusCode: 400,
    message: "Invalid Request",
    errorMessage: "",
    errorDetails: {
      path: null,
      value: null,
    },
  };
  if (error instanceof ZodError) {
    errorInfo = handlerZodError(error);
  } else if (error instanceof mongoose.Error.ValidationError) {
    errorInfo = handleValidationError(error);
  } else if (error instanceof mongoose.Error.CastError) {
    errorInfo = handlerCastError(error);
  } else if (error?.code === 11000) {
    errorInfo = handlerDuplicateError(error);
  } else if (error instanceof Error) {
    errorInfo.errorMessage = error.message;
  } else if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode;
    errorInfo.errorMessage = error.message;
  }

  return res.status(400).json({
    success: errorInfo.success,
    statusCode: errorInfo.statusCode,
    message: errorInfo.message,
    errorMessage: errorInfo.errorMessage,
    errorDetails: errorInfo.errorDetails,
    stack: NODE_ENV === "development" ? error.stack : null,
  });
};

export default globalErrorHandler;
