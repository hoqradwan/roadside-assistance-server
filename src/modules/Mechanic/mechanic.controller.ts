import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import Mechanic from "./mechanic.model";
import { createMechanicIntoDB, getAllMechanicsFromDB, makeMechanicIntoDB } from "./mechanic.service";

export const makeMechanic = catchAsync(async (req, res) => {
    const {email} = req.body;
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
    const result = await getAllMechanicsFromDB();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "All mechanics fetched successfully",
        data: result
    })
})

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
    const result = await Mechanic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!result) throw new Error("Mechanic not found");
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic updated successfully",
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