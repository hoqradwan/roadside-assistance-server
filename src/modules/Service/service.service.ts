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