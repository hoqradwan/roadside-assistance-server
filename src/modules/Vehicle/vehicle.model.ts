import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
    user: Types.ObjectId;
    vehicleModel: string;
    brand: string;
    number: string;
    description: string;
}

const VehicleSchema = new Schema<IVehicle>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleModel: { type: String, required: true },
    brand: { type: String, required: true },
    number: { type: String, required: true },
    description: { type: String, default: "description" },
});

const Vehicle = model<IVehicle>('Vehicle', VehicleSchema);

export default Vehicle;