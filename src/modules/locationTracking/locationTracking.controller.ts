import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import { cancelTrackingIntoDB, completeTrackingIntoDB, initializeTrackingIntoDB, updateMechanicLocationIntoDB, updateUserLocationIntoDB } from "./locationTracking.service";
import sendResponse from "../../utils/sendResponse";
import { trackingEventEmitter } from "./locationTracking.event";
import { io } from "../../utils/socket";

export const initializeTracking = catchAsync(async(req:CustomRequest, res:Response)=>{
    const {orderId} = req.body;
    const {id : userId} = req.user;
    const {mechanicId} = req.params;
    const result = await initializeTrackingIntoDB(orderId, userId, mechanicId);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Location tracking initialized successfully",
        data: result
    })
})
export const updateUserLocation = catchAsync(async(req:CustomRequest, res:Response)=>{
    const {orderId, lng, lat} = req.body;
    const {userId} = req.params;
    const result = await updateUserLocationIntoDB(orderId, userId, lng, lat);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User location updated successfully",
        data: result
    })

})
export const updateMechanicLocation = catchAsync(async(req:CustomRequest, res:Response)=>{
    const {orderId, lng, lat} = req.body;
    const {userId} = req.params;
    const result = await updateMechanicLocationIntoDB(orderId, userId, lng, lat);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic location updated successfully",
        data: result
    })

})
export const completeTracking = catchAsync(async(req:CustomRequest, res:Response)=>{
    const {orderId} = req.params;
    const result = await completeTrackingIntoDB(orderId);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Tracking completed successfully",
        data: result
    })
})
export const cancelTracking = catchAsync(async(req:CustomRequest, res:Response)=>{
    const {orderId} = req.params;
    const result = await cancelTrackingIntoDB(orderId);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Tracking cancelled successfully",
        data: result
    })
})



trackingEventEmitter.on('locationUpdate', (data) => {
  // Emit to specific room (service request)
  io?.to(`service-${data.orderId}`).emit('locationUpdate', data);
  
  // Also emit to user and mechanic specific rooms
  io?.to(`user-${data.userId}`).emit('locationUpdate', data);
  io?.to(`mechanic-${data.mechanicId}`).emit('locationUpdate', data);
});

trackingEventEmitter.on('mechanicArrived', (data) => {
  io?.to(`service-${data.orderId}`).emit('mechanicArrived', data);
  io?.to(`user-${data.userId}`).emit('mechanicArrived', data);
});

trackingEventEmitter.on('trackingCompleted', (data) => {
  io?.to(`service-${data.orderId}`).emit('trackingCompleted', data);
});

trackingEventEmitter.on('trackingCancelled', (data) => {
  io?.to(`service-${data.orderId}`).emit('trackingCancelled', data);
});
