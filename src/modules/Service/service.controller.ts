import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { addServiceToMechanicIntoDB, createServiceIntoDB, deleteServiceByMechanicFromDB, getAllServicesFromDB } from "./service.service";
import Service from "./service.model";
import { CustomRequest } from "../../utils/customRequest";
import { Response } from "express";

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
export const addServiceToMechanic = catchAsync(async (req:CustomRequest, res:Response) => {
    const {id:mechanicId} = req.user;
    const {serviceId} = req.params;
    const result = await addServiceToMechanicIntoDB(mechanicId,serviceId)
    if (!result) throw new Error("Service not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Service added to mechanic  successfully",
        data: result
    })
}
)
export const deleteServiceByMechanic = catchAsync(async (req:CustomRequest, res:Response) => {
    const {id:mechanicId} = req.user;
    const {serviceId} = req.params;
    const result = await deleteServiceByMechanicFromDB(mechanicId,serviceId)
    if (!result) throw new Error("Service not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Mechanic service removed successfully",
        data: result
    })
}
)
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
                                                                                                                   