import { Schema } from "mongoose";

export interface IWithdraw  {
    status: 'processing' | 'completed';
    amount: number;
    user: Schema.Types.ObjectId;
}