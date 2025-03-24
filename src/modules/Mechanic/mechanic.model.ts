import { Schema, model, Document, Types } from 'mongoose';

export interface IMechanic extends Document {
    user: Types.ObjectId;
    services: Types.ObjectId[];
    rating: number;
    experience: number;
    description: string;
    serviceCount:number;
    isAvailable:boolean;
}

const MechanicSchema = new Schema<IMechanic>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    services: [{ type: Schema.Types.ObjectId, ref: 'Service', required: true }],
    rating: { type: Number, required: true, default: 0 },
    experience: { type: Number, required: true },
    description: { type: String, default: "" },
    serviceCount : {type : Number, default : 0},
    isAvailable : {type : Boolean, default : true}
});

const Mechanic = model<IMechanic>('Mechanic', MechanicSchema);

export default Mechanic;