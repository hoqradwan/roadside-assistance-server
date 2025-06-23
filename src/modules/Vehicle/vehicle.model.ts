import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
    user: Types.ObjectId;
    vehicleModel: string;
    brand: string;
    number: string;
}

const VehicleSchema = new Schema<IVehicle>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleModel: { type: String, required: true },
    brand: { type: String, required: true },
    number: { type: String, required: true },
});

const Vehicle = model<IVehicle>('Vehicle', VehicleSchema);

export default Vehicle;