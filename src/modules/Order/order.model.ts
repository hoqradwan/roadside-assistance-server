import mongoose, { Schema, Document } from 'mongoose';
import { generateUniqueId } from './order.utils';

export interface IOrder extends Document {
    user: mongoose.Schema.Types.ObjectId;
    mechanic: mongoose.Schema.Types.ObjectId;
    service:mongoose.Schema.Types.ObjectId;
    vehicle: mongoose.Schema.Types.ObjectId;
    status: string;
}
const OrderSchema: Schema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service',required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle',required: true },
    status: { type: String, required: true, enum: ['pending', 'processing', 'completed', 'cancelled'] , default: 'pending'},    
    total : {type : Number, required : true},
    profit: {type : Number, required : true},
    payment : {type : String, enum:["online","cash"], required : true, default : "online"},
    uniqueOrderId: { type: String, default: generateUniqueId },
}, {
    timestamps: true
});

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;