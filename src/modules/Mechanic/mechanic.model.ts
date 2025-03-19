import { Schema, model, Document, Types } from 'mongoose';

export interface IMechanic extends Document {
    user: Types.ObjectId;
    services: Types.ObjectId[];
    rating: number;
    experience: number;
    description: string;
}

const MechanicSchema = new Schema<IMechanic>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    services: [{ type: Schema.Types.ObjectId, ref: 'Service', required: true }],
    rating: { type: Number, required: true, default: 0 },
    experience: { type: Number, required: true },
    description: { type: String, default: "" }
});

const Mechanic = model<IMechanic>('Mechanic', MechanicSchema);

export default Mechanic;