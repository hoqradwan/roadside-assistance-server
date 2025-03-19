import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { Request, Response } from "express";
import Favourite from "./favourite.model";
interface CustomRequest extends Request {
    user?: any;
}
export const addFavourite =catchAsync(async (req: CustomRequest, res: Response) => {
    console.log("Add favourite",req);
    const { mechanic } = req.body;
    const userId = req.user.id;
    const existingFavourite = await Favourite.findOne({ mechanic, user: userId });
    if (existingFavourite) throw new Error("mechanic already in favourites");
    const result = await Favourite.create({ mechanic, user: userId });
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