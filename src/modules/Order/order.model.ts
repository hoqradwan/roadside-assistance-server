import mongoose, { Schema } from 'mongoose';
import { generateUniqueId } from './order.utils';
import { IOrder } from './order.interface';


const OrderSchema: Schema = new Schema<IOrder>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }],
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    status: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'cancelled'], default: 'pending' },
    total: { type: Number, required: true },
    payment: { type: String, enum: ["online", "cash"], required: true, default: "online" },
    uniqueOrderId: { type: String, default: generateUniqueId },
}, {
    timestamps: true
});

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;