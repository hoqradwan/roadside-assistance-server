import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
    name: string;
    description: string;
    price: number;
    available: boolean;
}

const ServiceSchema: Schema = new Schema({
    image : { type: String, default: "" },
    name: { type: String, required: true, unique : true },
});

const Service = mongoose.model<IService>('Service', ServiceSchema);

export default Service;