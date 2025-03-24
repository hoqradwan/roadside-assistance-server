import Service from "../Service/service.model";
import { UserModel } from "../user/user.model";
import Mechanic, { IMechanic } from "./mechanic.model";

export const makeMechanicIntoDB = async (email : string) => {
    const user = await UserModel.findOne({email});
    if(!user) throw new Error("User not found");
    const result  = await UserModel.findOneAndUpdate({email}, {role:"mechanic"}, {new: true});
    return result;
}

export const createMechanicIntoDB = async (mechanic : IMechanic) => {  
    const user = await UserModel.findById(mechanic.user);
    if(!user) throw new Error("User not found");
    if(user.role !== "mechanic") throw new Error("User is not a mechanic");
    if(mechanic.services.length === 0) throw new Error("Mechanic should have atleast one service");
    if(mechanic.rating < 0 || mechanic.rating > 5) throw new Error("Rating should be between 0 and 5");
    if(mechanic.experience < 0) throw new Error("Experience should be greater than 0");
    const services = await Service.find({_id:{$in:mechanic.services}});  
    if(services.length !== mechanic.services.length) throw new Error("Service not found");                                                                         
    const result = await Mechanic.create(mechanic);
    return result;
}

export const getAllMechanicsFromDB = async () => {
    const result = await Mechanic.find();
    return result;

}

export const toggleAvailabilityIntoDB = async (mechanicId : string) => {
    const mechanic = await Mechanic.findById(mechanicId);
    if(!mechanic) throw new Error("Mechanic not found");
    const result = await Mechanic.findByIdAndUpdate(mechanicId, {isAvailable : !mechanic.isAvailable}, {new : true}); 
    return result;
}