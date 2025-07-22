import { Schema } from "mongoose";

export interface IWithdraw  {
    status: 'withdraw';
    amount: number;
    user: Schema.Types.ObjectId;
    adminStatus: 'pending'|'processing'|'completed'|'cancelled'; // Define the type for adminStatus as needed
}