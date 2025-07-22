import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { CustomRequest } from "../../utils/customRequest";
import Service from "../Service/service.model";
import { MechanicServiceRateModel } from "./mechanicServiceRate.model";
import sendResponse from "../../utils/sendResponse";
import { Types } from "mongoose";



interface ServiceData {
    service: string; // ID of the service (ObjectId as string)
    price: number;   // Price of the service
}

export const updateMechanicServiceRate = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: mechanicId } = req.user;
    const { services }: { services: ServiceData[] } = req.body;

    if (!services || services.length === 0) {
        throw new Error("Services are required");
    }

    const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: mechanicId });

    if (!mechanicServiceRate) {
        throw new Error("Mechanic service rate not found");
    }

    // Mapping over services and checking each one
    const updatedMechanicServiceRate = await Promise.all(services.map(async (service: ServiceData) => {
        const mechanicServiceRate = await MechanicServiceRateModel.findOneAndUpdate({ mechanic: mechanicId, "services.service": service.service },
            { $set: { "services.$.price": service.price } },
            { new: true } // Return the updated document
        );
        if (!mechanicServiceRate) {
            throw new Error(`failed to update service rate for service ID: ${service.service}`);
        }

        const serviceData = await Service.findById(service.service);
        if (!serviceData) {
            throw new Error(`Service with ID ${service.service} not found`);
        }

        if (service.price && service.price < 0) {
            throw new Error(`Price cannot be negative`);
        }

        // Return the service in the correct structure with ObjectId and price
        return {
            service: new Types.ObjectId(service.service), // Ensuring ObjectId type
            price: service.price,
        };
    }));

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic service price updated successfully",
        data: updatedMechanicServiceRate,
    });
});

export const getMechanicServiceRate = catchAsync(async (req: CustomRequest, res: Response) => {
    const { id: mechanicId } = req.user;

    const mechanicServiceRate = await MechanicServiceRateModel.findOne({ 
        mechanic: mechanicId 
    }).populate("mechanic services.service");

    if (!mechanicServiceRate) {
        throw new Error("Mechanic service rate not found");
    }

    // Filter out deleted services after fetching
    const activeServices = mechanicServiceRate.services.filter((service: any) => !service.isDeleted);

    let formattedServices = activeServices.map((service: any) => {
        return {
            _id: service.service._id,
            name: service.service.name,
            image: service.service.image,
            price: service.price,
        };
    });

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Mechanic services with price retrieved successfully",
        data: formattedServices,
    });
});