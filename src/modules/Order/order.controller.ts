import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { acceptOrderIntoDB, cancelOrderFromDB, createOrderIntoDB, getOrderByIdFromDB, getOrdersByMechanicFromDB, getOrdersByStatusForAdminFromDB, getOrdersByStatusFromDB, getOrdersByUserFromDB, getOrdersFromDB, getSingleOrderFromDB, makePaymentIntoDB, markAsCompleteIntoDB, verifyOrderCompletionFromUserEndIntoDB } from "./order.service";
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
export const makePayment = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: userId } = req.user; // Extract user ID from the request
    const orderId = req.params.orderId; // Extract booking ID from the request parameters
    // solved after receiving req.body.data and then formatting it. then accessing the objects inside data object bookingData paymentData
   const paymentData = req.body; // Extract payment data from the request body
    const result = await makePaymentIntoDB(userId,orderId,paymentData); // Call service to add booking into DB
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Payment completed successfully",
        data: result, // Replace with actual booking data if available
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
  const { id: userId, role } = req.user;
  const result = await getOrdersByUserFromDB(userId, role);
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
export const getOrderById = catchAsync(async (req: CustomRequest, res: Response) => {
  const result = await getOrderByIdFromDB(req.params.orderId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order for admin fetched successfully",
    data: result,
  });
})

export const getOrdersByStatus = catchAsync(async (req: CustomRequest, res: Response) => {
  let status = req.params.status;
  const userData = req.user

  const result = await getOrdersByStatusFromDB(status, userData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order fetched by status successfully",
    data: result,
  });
})
export const getOrdersByStatusForAdmin = catchAsync(async (req: CustomRequest, res: Response) => {

  const result = await getOrdersByStatusForAdminFromDB();

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
export const acceptOrder = catchAsync(async (req: CustomRequest, res: Response) => {
  const orderId = req.params.orderId;
  const { id: userId } = req.user
  const result = await acceptOrderIntoDB(orderId, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order accepted successfully",
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

