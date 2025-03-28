import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createVehicleIntoDB, deleteVehicleFromDB, getSingleVehicleFromDB, getVehiclesFromDB, updateVehicleIntoDB } from "./vehicle.service";
import Vehicle from "./vehicle.model";
import { Request, Response } from "express";
import { CustomRequest } from "../../utils/customRequest";
import { get } from "mongoose";

export const createVehicle = catchAsync(async (req :Request, res:Response) => {
    const result = await createVehicleIntoDB(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED, success: true,
        message: "Vehicle created successfully",
        data: result
    })
})

export const getVehicles = catchAsync(async (req :CustomRequest, res : Response) => {
    const result = await getVehiclesFromDB(req.user);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All vehicles fetched successfully",
        data: result
    })
})

export const getSingleVehicle = catchAsync(async (req:CustomRequest, res:Response) => {
  const result = await getSingleVehicleFromDB(req.params.id, req.user);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Vehicle fetched successfully",
        data: result
    })
})

export const updateVehicle = catchAsync(async (req : CustomRequest, res : Response) => {
    const result = await updateVehicleIntoDB(req.params.id, req.body, req.user);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Vehicle updated successfully",
        data: result
    })
})

export const deleteVehicle = catchAsync(async (req :CustomRequest, res : Response) => {
    const result = await deleteVehicleFromDB(req.params.id, req.user);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Vehicle deleted successfully",
        data: result
    })
})