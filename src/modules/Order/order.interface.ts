import mongoose, { Document } from "mongoose";

export interface IOrder extends Document {
    user: mongoose.Schema.Types.ObjectId;
    mechanic: mongoose.Schema.Types.ObjectId;
    services: mongoose.Schema.Types.ObjectId[];
    vehicle: mongoose.Schema.Types.ObjectId;
    status: string;
    payment: 'online' | 'cash';
    uniqueOrderId: string;
    additionalNotes ?: string;
    address: string;
    streetNo: string;
    total : number;
}