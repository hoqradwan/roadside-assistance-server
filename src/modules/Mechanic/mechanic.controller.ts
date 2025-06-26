import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import sendResponse from "../../utils/sendResponse";
import Mechanic from "./mechanic.model";
import { createMechanicIntoDB,  getAllMechanicsFromDB, getAllTestMechanicsFromDB, getMechanicWithServicePriceFromDB, getSingleMechanicAdminFromDB, getSingleMechanicFromDB, makeMechanicIntoDB, sortMechanics, toggleAvailabilityIntoDB } from "./mechanic.service";

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

export const getAllMechanics = catchAsync(async (req : CustomRequest, res) => {
    const { currentPage = 1, limit = 10 } = req.query;
    const {id : userId} = req.user;
    // Call the service function to get the mechanics with pagination
    const result = await getAllMechanicsFromDB({
        currentPage: parseInt(currentPage as string),  // Ensure currentPage is a number
        limit: parseInt(limit as string),  // Ensure limit is a number
        userId: userId // Pass the userId to the service function
    });

    // Send the response to the client
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'All mechanics fetched successfully',
        data: result,
    });
});

export const getMechanicWithServicePrice = catchAsync(async (req : CustomRequest, res) => {
    const mechanicId = req.params.id; // Use the ID from the request params or the user ID if not provided
    // Call the service function to get the mechanics with pagination
    const result = await getMechanicWithServicePriceFromDB(mechanicId);
    // Send the response to the client
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Mechanic with service prices retrieved successfully',
        data: result,
    });
});
export const getSingleMechanic = catchAsync(async (req : CustomRequest, res) => {
    const mechanicId = req.params.userId; // Use the ID from the request params or the user ID if not provided
    // Call the service function to get the mechanics with pagination
    const result = await getSingleMechanicFromDB(mechanicId);
    // Send the response to the client
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Mechanic retrieved successfully',
        data: result,
    });
});
export const getSingleMechanicAdmin = catchAsync(async (req : CustomRequest, res) => {
    const mechanicId = req.params.userId; // Use the ID from the request params or the user ID if not provided
    // Call the service function to get the mechanics with pagination
    const result = await getSingleMechanicAdminFromDB(mechanicId);
    // Send the response to the client
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Mechanic retrieved successfully for admin panel',
        data: result,
    });
});
export const getSortedMechanics = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: currentUserId } = req.user;
    const { sortBy = 'rating', serviceName = '' } = req.query; // Default to 'rating'

    const sortedMechanics = await sortMechanics({
        currentUserId,
        sortBy: sortBy as 'rating' | 'nearest',  // Sort by either 'rating' or 'nearest'
        serviceName: serviceName as string, // Filter by service name if provided
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
export const getAllTestMechanics = catchAsync(async (req: CustomRequest, res) => {
    const { currentPage = 1, limit = 10, serviceName } = req.query;
    const { id: userId } = req.user;
    
    // Properly handle serviceName - convert empty strings and "undefined" to undefined
    let cleanedServiceName: string | undefined = serviceName as string;
    
    if (!cleanedServiceName || 
        cleanedServiceName === '' || 
        cleanedServiceName === '""' || 
        cleanedServiceName === "''" ||
        cleanedServiceName === 'undefined' ||
        cleanedServiceName === 'null') {
        cleanedServiceName = undefined;
    }
    console.log("Hiting")
    console.log("cleanedServiceName", cleanedServiceName);
    // Call the service function to get the mechanics with pagination
    const result = await getAllTestMechanicsFromDB({
        currentPage: parseInt(currentPage as string),  // Ensure currentPage is a number
        limit: parseInt(limit as string),  // Ensure limit is a number
        userId: userId, // Pass the userId to the service function
        serviceName: cleanedServiceName // Pass the cleaned serviceName (undefined for empty cases)
    });

    // Send the response to the client
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'All mechanics fetched successfully',
        data: result,
    });
});
// export const getSortedMechanicsWithSearch = catchAsync(async (req: CustomRequest, res: Response) => {
//     const { id: currentUserId } = req.user;
//     const { currentPage = 1, limit = 10, sortBy = 'rating', serviceName = '' } = req.query; // Default to 'rating'

//     const result = await getAllMechanicsWithSortingAndSearch({
//         currentPage: parseInt(currentPage as string), // Ensure it's a number
//         limit: parseInt(limit as string),  // Ensure it's a number
//         userId: currentUserId, // Pass the user ID
//         sortBy: sortBy as 'rating' | 'nearest',
//         serviceName: serviceName as string,  // Filter by service name if provided
//     });

//     sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: `Mechanics sorted by ${sortBy} fetched successfully`,
//         data: result,
//     });
// });
