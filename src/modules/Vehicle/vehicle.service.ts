import { IUser } from "../user/user.interface";
import Vehicle, { IVehicle } from "./vehicle.model";

export const createVehicleIntoDB = async (vehicle: IVehicle, userId : string) => {
    const existingVehicle = await Vehicle.findOne({ number: vehicle.number });
    if (existingVehicle) throw new Error("Vehicle already exists");
    const result = await Vehicle.create({...vehicle, user: userId});
    return result;
}

export const getVehiclesFromDB = async (userId : string) => {
  
    const result = await Vehicle.find({user: userId}).select("-__v ");
    return result;
}
export const getSingleVehicleFromDB = async (vehicleId: string, userData: Partial<IUser>) => {
    if (userData.role === "user") {
        const result = await Vehicle.find({ _id: vehicleId, user: userData.id });
        return result;
    };
    const result = await Vehicle.findById(vehicleId);
    return result;
}
export const updateVehicleIntoDB = async (vehicleId: string, vehicleData: Partial<IVehicle>, userData: Partial<IUser>) => {
    if (userData.role === "user") {
        const userVehicle = await Vehicle.findOneAndUpdate(
            { _id: vehicleId, user: userData.id },
            vehicleData,
            { new: true }
        );
        if (!userVehicle) throw new Error("Vehicle not found or you do not have permission to update this vehicle");
        return userVehicle;
    }
    const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicleId, vehicleData, { new: true });
    if (!updatedVehicle) throw new Error("Vehicle not found");
    return updatedVehicle;
}
export const deleteVehicleFromDB = async (vehicleId: string,  userData: Partial<IUser>) => {
    if (userData.role === "user") {
        const userVehicle = await Vehicle.findOneAndDelete(
            { _id: vehicleId, user: userData.id },
        );
        if (!userVehicle) throw new Error("Vehicle not found or you do not have permission to delete this vehicle");
        return userVehicle;
    }
    const updatedVehicle = await Vehicle.findByIdAndDelete(vehicleId);
    if (!updatedVehicle) throw new Error("Vehicle not found");
    return updatedVehicle;
}