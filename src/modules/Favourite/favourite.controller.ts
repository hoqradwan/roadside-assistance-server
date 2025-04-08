import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { Request, Response } from "express";
import Favourite from "./favourite.model";
import { CustomRequest } from "../../utils/customRequest";
import { addFavouriteIntoDB } from "./favourite.service";

export const addFavourite =catchAsync(async (req: CustomRequest, res: Response) => {
    const { mechanic } = req.body;
    const userId = req.user.id;
    const result = await addFavouriteIntoDB(mechanic, userId);
   
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Mechanic added to favourites",
        data: null
    })
})

export const getFavourites = catchAsync(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const result = await Favourite.find({ user: userId }).populate("mechanic");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Favourites fetched successfully",
        data: result
    })
})

export const removeFavourite = catchAsync(async (req: CustomRequest, res: Response) => {
    const userId = req.user.id;
    const result = await Favourite.findOneAndDelete({ user: userId, mechanic: req.params.id });
    if (!result) throw new Error("Favourite not found");
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Favourite removed successfully",
        data: null
    })
})