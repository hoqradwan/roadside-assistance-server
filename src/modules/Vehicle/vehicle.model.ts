import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
    user: Types.ObjectId;
    vehicleModel: string;
    brand: string;
    number: string;
}

const VehicleSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    model: { type: String, required: true },
    brand: { type: String, required: true },
    number: { type: String, required: true },
});

const Vehicle = model('Vehicle', VehicleSchema);

export default Vehicle;