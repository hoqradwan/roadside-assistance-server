import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import Order from "./order.model";
import { createOrderIntoDB } from "./order.service";

export const createOrder = catchAsync(async (req,res) => {
  // Create a new order
  const result = await createOrderIntoDB(req.body);
  sendResponse(res,  {
    statusCode: 200,
    success: true,
    message: "Order created successfully",
    data: result,
  });
})

export const getOrders = catchAsync(async (req,res) => {    
    const result = await Order.find({});
  sendResponse(res,  {
    statusCode: 200,
    success: true,
    message: "Orders fetched successfully",
    data: result,
  });
})
export const getSingleOrder = catchAsync(async (req,res) => {    
    const result = await Order.findById(req.params.id);
  sendResponse(res,  {
    statusCode: 200,
    success: true,
    message: "Order fetched successfully",
    data: result,
  });
})
// Compare this snippet from src/modules/Order/order.service.ts: