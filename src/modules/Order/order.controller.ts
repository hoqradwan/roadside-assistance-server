import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import Order from "./order.model";
import { cancelOrderFromDB, createOrderIntoDB, getOrdersByMechanicFromDB, getOrdersByStatusFromDB, getOrdersByUserFromDB, getOrdersFromDB, getSingleOrderFromDB, markAsCompleteIntoDB, verifyOrderCompletionFromUserEndIntoDB } from "./order.service";
import { CustomRequest } from "../../utils/customRequest";

export const createOrder = catchAsync(async (req: CustomRequest, res: Response) => {
  const { id: userId } = req.user;
  const orderData = req.body;
  const result = await createOrderIntoDB(userId, orderData);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order created successfully",
    data: result,
  });
})
export const markAsComplete = catchAsync(async (req: CustomRequest, res: Response) => {
  const { orderId } = req.params;
  const { id: mechanicId } = req.user;
  const result = await markAsCompleteIntoDB(orderId, mechanicId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order completion request sent to user successfully",
    data: result,
  });
})

export const getOrders = catchAsync(async (req: Request, res: Response) => {
  const { currentPage = 1, limit = 10 } = req.query;
  const result = await getOrdersFromDB({
    currentPage: parseInt(currentPage as string),  // Ensure currentPage is a number
    limit: parseInt(limit as string),  // Ensure limit is a number
  })
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders fetched successfully",
    data: result,
  });
})
export const getOrdersByUser = catchAsync(async (req: CustomRequest, res: Response) => {
  const { id:userId } = req.user;
  const result = await getOrdersByUserFromDB(userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders by user fetched successfully",
    data: result,
  });
})
export const getSingleOrder = catchAsync(async (req: CustomRequest, res: Response) => {
  const userdata = req.user;
  const result = await getSingleOrderFromDB(req.params.id, userdata);
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
export const cancelOrder = catchAsync(async (req: CustomRequest, res: Response) => {
  const orderId = req.params.orderId;
  const { id: userId } = req.user
  const result = await cancelOrderFromDB(orderId, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully",
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
export const verifyOrderCompletionFromUserEnd = catchAsync(async (req: CustomRequest, res: Response) => {
  const { id: userId } = req.user;
  const { orderId } = req.params;
  const { code } = req.body;
  const result = await verifyOrderCompletionFromUserEndIntoDB(orderId, userId, code);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order has completed successfully",
    data: result,
  })
})