import { Schema } from "mongoose";

export interface IWithdraw  {
    status: 'withdraw';
    amount: number;
    user: Schema.Types.ObjectId;
}