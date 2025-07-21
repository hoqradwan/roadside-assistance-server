import mongoose from "mongoose";
import Mechanic from "../Mechanic/mechanic.model";
import Service, { IService } from "./service.model";
import { MechanicServiceRateModel } from "../MechanicServiceRate/mechanicServiceRate.model";

export const createServiceIntoDB = async (service: any, image: any) => {
    const result = await Service.create({ name: service.name, image });
    return result;
};

export const getAllServicesFromDB = async () => {
    // Select only necessary fields from the database to minimize data transfer
    const result = await Service.find().select('_id name image');

    const serviceWithPrice = result.map(doc => {
        const { _id, name, image } = doc.toObject() as { _id: any; name: string; image?: string };
        return {
            _id,
            name,
            image: image || null, // Use null if image is not defined
            price: 0, // Price is always zero, no need to assign in map unless it changes
        };
    });

    return serviceWithPrice;
};

export const addServiceToMechanicIntoDB = async (mechanicId: string, serviceData: any) => {
    // Remove the serviceId from the services array of the specified mechanic
    const mechanic = await Mechanic.findOne({ user: mechanicId });
    if (!mechanic) {
        throw new Error("Mechanic not found");
    }
    // Check if the service is already added to the mechanic
    const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: mechanicId });
    if (!mechanicServiceRate) {
        throw new Error("Mechanic service rate not found");
    }
    const serviceAlreadyExists = mechanicServiceRate.services.some(
        (s: any) => s.service.toString() === serviceData.serviceId
    );
    if (serviceAlreadyExists) {
        throw new Error("Service already added to the mechanic");
    }

    const addedMechanicService = await MechanicServiceRateModel.findOneAndUpdate(
        { mechanic: mechanicId },
        { $push: { services: { service: serviceData.serviceId, price: serviceData.price, isDeleted: false } } },
        { new: true } // Return the updated document
    );

    if (!addedMechanicService) {
        throw new Error("Mechanic or service not found");
    }

    // Optionally, return all services after the update
    return addedMechanicService;
};
export const deleteServiceByMechanicFromDB = async (mechanicId: string, serviceId: string) => {
    // Remove the serviceId from the services array of the specified mechanic
    const mechanicService = await MechanicServiceRateModel.findOneAndUpdate(
        { mechanic: mechanicId, "services.service": serviceId },
        { $set: { "services.$.isDeleted": true } },
        { new: true }
    );

    if (!mechanicService) {
        throw new Error("Mechanic or service not found");
    }

    // Optionally, return all services after the update
    return mechanicService;
};