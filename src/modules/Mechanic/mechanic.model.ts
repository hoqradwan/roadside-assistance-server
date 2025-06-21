import { Schema, model, Document, Types } from 'mongoose';
import { generateUniqueId } from '../Order/order.utils';

export interface IMechanic extends Document {
    user: Types.ObjectId;
    services: Types.ObjectId[];
    rating: number;
    experience: number;
    description: string;
    serviceCount: number;
    isAvailable: boolean;
    uniqueMechanicId: string;
}

const MechanicSchema = new Schema<IMechanic>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    services: [{ type: Schema.Types.ObjectId, ref: 'Service'}],
    rating: { type: Number, required: true, default: 0 },
    experience: { type: Number, required: true },
    description: { type: String, default: "" },
    serviceCount: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    uniqueMechanicId: { type: String, default: generateUniqueId },
});

// Add a pre-save hook to update serviceCount based on the length of services
MechanicSchema.pre('save', function (next) {
    this.serviceCount = this.services.length;
    next();
});

const Mechanic = model<IMechanic>('Mechanic', MechanicSchema);

export default Mechanic;