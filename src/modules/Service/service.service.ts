import mongoose from "mongoose";
import Mechanic from "../Mechanic/mechanic.model";
import Service, { IService } from "./service.model";

export const createServiceIntoDB = async (service:IService) => {
    const existingService = await Service.findOne({name:service.name});
    if(existingService) throw new Error("Service already exists");
    const result = await Service.create(service);
    return result;
};

export const getAllServicesFromDB = async () => {
    const result = await Service.find();
    return result;
}
export const addServiceToMechanicIntoDB = async (mechanicId: string, serviceId: string) => {
    // Remove the serviceId from the services array of the specified mechanic
    const mechanic = await Mechanic.findOne({ user: mechanicId });
    if (!mechanic) {
        throw new Error("Mechanic not found");
    }

    if (mechanic.services.includes(new mongoose.Types.ObjectId(serviceId))) {
        throw new Error("Service already added to the mechanic");
    }

    const addedMechanicService = await Mechanic.findOneAndUpdate(
        { user: mechanicId },
        { $push: { services: serviceId } },
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
    const mechanicService = await Mechanic.findOneAndUpdate(
        { user: mechanicId },
        { $pull: { services: serviceId } },
        { new: true } // Return the updated document
    );

    if (!mechanicService) {
        throw new Error("Mechanic or service not found");
    }

    // Optionally, return all services after the update
    return mechanicService;
};