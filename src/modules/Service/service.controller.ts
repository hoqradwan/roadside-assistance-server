import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createServiceIntoDB, getAllServicesFromDB } from "./service.service";
import Service from "./service.model";

export const createService = catchAsync(async (req, res) => {
    const result = await createServiceIntoDB(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Service created successfully",
        data: result
    })
})
export const getAllServices = catchAsync(async (req, res) => {
    const result = await getAllServicesFromDB();
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All services fetched successfully",
        data: result
    })
})

export const getServiceById = catchAsync(async (req, res) => {

    const result = await Service.findById(req.params.id);
    if (!result) throw new Error("Service not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Service fetched successfully",
        data: result
    })
})             
export const updateService = catchAsync(async (req, res) => {
    const result = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!result) throw new Error("Service not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Service updated successfully",
        data: result
    })
})             
export const deleteService = catchAsync(async (req, res) => {
    const result = await Service.findByIdAndDelete(req.params.id);
    if (!result) throw new Error("Service not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Service deleted successfully",
        data: result
    })
}
)
                                                                                                                   