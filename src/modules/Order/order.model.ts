import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
    user: mongoose.Schema.Types.ObjectId;
    mechanic: mongoose.Schema.Types.ObjectId;
    service: string;
    status: string;
}

const OrderSchema: Schema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    service: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'in-progress', 'completed', 'cancelled'] },
    total : {type : Number, required : true}
}, {
    timestamps: true
});

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;