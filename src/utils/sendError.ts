import { Response } from "express";

type ErrorData = {
  [key: string]: any;
};

const sendError = (
  res: Response,
  statusCode: number,
  errorData: ErrorData,
): void => {
  res.status(statusCode).send({
    success: false,
    ...errorData,
  });
};

export default sendError;
