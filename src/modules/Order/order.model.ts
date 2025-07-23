import mongoose, { Schema } from 'mongoose';
import { generateUniqueId } from './order.utils';
import { IOrder } from './order.interface';


const OrderSchema: Schema = new Schema<IOrder>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MechanicServiceRate', required: true }],
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    status: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'cancelled','paid'], default: 'processing' },
    total: { type: Number, required: true },
      location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    address: { type: String, required: true },
    streetNo: { type: String, required: true },
    payment: { type: String, enum: ["online", "cash"], required: true, default: "online" },
    uniqueOrderId: { type: String, default: generateUniqueId },
    additionalNotes: { type: String, default: "" },
}, {
    timestamps: true
});

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;