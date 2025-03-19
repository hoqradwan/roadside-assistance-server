import Vehicle, { IVehicle } from "./vehicle.model";

export const createVehicleIntoDB = async (vehicle:IVehicle) => {
    const existingVehicle = await Vehicle.findOne({number:vehicle.number});
    if(existingVehicle) throw new Error("Vehicle already exists");
    const result = await Vehicle.create(vehicle);
    return result;
}