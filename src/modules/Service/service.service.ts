import mongoose from "mongoose";
import Mechanic from "../Mechanic/mechanic.model";
import Service, { IService } from "./service.model";
import { MechanicServiceRateModel } from "../MechanicServiceRate/mechanicServiceRate.model";

export const createServiceIntoDB = async (service: any, image: any) => {
   
    const result = await Service.create({ name: service.name, image });
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
    // Check if the service is already added to the mechanic
    const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: mechanicId });
    if (!mechanicServiceRate) {
        throw new Error("Mechanic service rate not found");
    }
    const serviceAlreadyExists = mechanicServiceRate.services.some(
        (s: any) => s.service.toString() === serviceId
    );
    if (serviceAlreadyExists) {
        throw new Error("Service already added to the mechanic");
    }
       
    const addedMechanicService = await MechanicServiceRateModel.findOneAndUpdate(
        { mechanic: mechanicId },
        { $push: { services: { service: serviceId } } },
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
        { mechanic: mechanicId },
        { $pull: { services: { service: serviceId } } },
        { new: true }
    );

    if (!mechanicService) {
        throw new Error("Mechanic or service not found");
    }

    // Optionally, return all services after the update
    return mechanicService;
};