import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import Mechanic from "./mechanic.model";
import { createMechanicIntoDB, getAllMechanicsFromDB, makeMechanicIntoDB, sortMechanics, toggleAvailabilityIntoDB } from "./mechanic.service";

export const makeMechanic = catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await makeMechanicIntoDB(email);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic made successfully",
        data: result
    })
})
export const createMechanic = catchAsync(async (req, res) => {
    const result = await createMechanicIntoDB(req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic created successfully",
        data: result
    })
})

export const getAllMechanics = catchAsync(async (req, res) => {
    const { currentPage = 1, limit = 10 } = req.query;

    // Call the service function to get the mechanics with pagination
    const result = await getAllMechanicsFromDB({
        currentPage: parseInt(currentPage as string),  // Ensure currentPage is a number
        limit: parseInt(limit as string),  // Ensure limit is a number
    });

    // Send the response to the client
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'All mechanics fetched successfully',
        data: result,
    });
});
export const getSortedMechanics = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: currentUserId } = req.user;
    const { sortBy = 'rating' } = req.query; // Default to 'rating'

    const sortedMechanics = await sortMechanics({
        currentUserId,
        sortBy: sortBy as 'rating' | 'nearest',  // Sort by either 'rating' or 'nearest'
    });

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: `Mechanics sorted by ${sortBy} fetched successfully`,
        data: sortedMechanics,
    });
});
export const getMechanicById = catchAsync(async (req, res) => {
    const result = await Mechanic.findById(req.params.id);
    if (!result) throw new Error("Mechanic not found");
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic fetched successfully",
        data: result
    })
})
export const updateMechanic = catchAsync(async (req, res) => {
    const result = await Mechanic.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { services: req.body.services } },
        { new: true }
    );

    if (!result) throw new Error("Mechanic not found");
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic updated successfully",
        data: result
    })
})

export const toggleAvailability = catchAsync(async (req, res) => {
    const result = await toggleAvailabilityIntoDB(req.params.id);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic availability toggled successfully",
        data: result
    })
})
export const deleteMechanic = catchAsync(async (req, res) => {
    const result = await Mechanic.findByIdAndDelete(req.params.id);
    if (!result) throw new Error("Mechanic not found");
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic deleted successfully",
        data: result
    })
})