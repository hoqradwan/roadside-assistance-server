import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import Order from "./order.model";
import { createOrderIntoDB, getOrdersByMechanicFromDB, getOrdersByStatusFromDB } from "./order.service";
import { CustomRequest } from "../../utils/customRequest";

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  // Create a new order
  const result = await createOrderIntoDB(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order created successfully",
    data: result,
  });
})

export const getOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await Order.find({});
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders fetched successfully",
    data: result,
  });
})
export const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await Order.findById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order fetched successfully",
    data: result,
  });
})
export const getOrdersByStatus = catchAsync(async (req: CustomRequest, res: Response) => {
  const { status } = req.body;
  const userData = req.user
  const result = await getOrdersByStatusFromDB(status, userData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order fetched by status successfully",
    data: result,
  });
})
export const getOrdersByMechanic = catchAsync(async (req: CustomRequest, res: Response) => {
  const { mechanicid } = req.params;
  const userData = req.user
  const result = await getOrdersByMechanicFromDB(mechanicid, userData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order fetched by status successfully",
    data: result,
  });
})
