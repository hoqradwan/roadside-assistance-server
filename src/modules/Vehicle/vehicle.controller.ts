import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createVehicleIntoDB } from "./vehicle.service";
import Vehicle from "./vehicle.model";

export const createVehicle = catchAsync(async (req, res) => {
    const result = await createVehicleIntoDB(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED, success: true,
        message: "Vehicle created successfully",
        data: result
    })
})

export const getVehicles = catchAsync(async (req, res) => {
    const result = await Vehicle.find();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All vehicles fetched successfully",
        data: result
    })
})

export const getVehicleById = catchAsync(async (req, res) => {
    const result = await Vehicle.findById(req.params.id);
    if (!result) throw new Error("Vehicle not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Vehicle fetched successfully",
        data: result
    })
})

export const updateVehicle = catchAsync(async (req, res) => {
    const result = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!result) throw new Error("Vehicle not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Vehicle updated successfully",
        data: result
    })
})

export const deleteVehicle = catchAsync(async (req, res) => {
    const result = await Vehicle.findByIdAndDelete(req.params.id);
    if (!result) throw new Error("Vehicle not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Vehicle deleted successfully",
        data: result
    })
})