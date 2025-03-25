import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { createCommissionIntoDB, deleteCommissionIntoDB, getCommissionsFromDB, updateCommissionIntoDB } from "./commission.service";
import { Request, Response } from "express";

export const getCommissions = catchAsync(async (req : Request, res : Response) => {
    const result = await getCommissionsFromDB();
    sendResponse(res, {
        statusCode : httpStatus.OK,
        success : true,
        message : "Commissions fetched successfully",
        data : result
    })
})
export const createCommission = catchAsync(async (req : Request, res : Response) => {
    const commissionData = req.body;
    const result = await createCommissionIntoDB(commissionData);
    sendResponse(res, {
        statusCode : httpStatus.OK,
        success : true,
        message : "Commissions created successfully",
        data : result
    })
})
export const updateCommission = catchAsync(async (req : Request, res : Response) => {
    const commissionData = req.body;
    const {commissionId} = req.params;
    const result = await updateCommissionIntoDB(commissionData,commissionId);
    sendResponse(res, {
        statusCode : httpStatus.OK,
        success : true,
        message : "Commissions updated successfully",
        data : result
    })
})
export const deleteCommission = catchAsync(async (req : Request, res : Response) => {
    const {commissionId} = req.params;
    const result = await deleteCommissionIntoDB(commissionId);
    sendResponse(res, {
        statusCode : httpStatus.OK,
        success : true,
        message : "Commissions deleted successfully",
        data : result
    })
})