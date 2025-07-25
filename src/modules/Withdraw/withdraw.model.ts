import { Schema, model, Document } from 'mongoose';
import { IWithdraw } from './withdraw.interface';


const WithdrawSchema = new Schema<IWithdraw>({
    status: {
        type: String,
        enum: ["withdraw"],
        required: true,
        default : 'withdraw'
    },
    adminStatus:{
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        required: true,
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

const Withdraw = model<IWithdraw>('Withdraw', WithdrawSchema);

export default Withdraw;