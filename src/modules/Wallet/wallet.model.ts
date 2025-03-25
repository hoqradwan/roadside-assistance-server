import { Schema, model, Document } from 'mongoose';

interface IWallet extends Document {
    totalEarnings: number;
    availableBalance: number;
    numberOfWithdrawRequests: number;
    totalPaidAmount: number;
    totalWithdraw: number;
}

const WalletSchema: Schema = new Schema({
    totalEarnings: { type: Number, required: true, default: 0 },
    availableBalance: { type: Number, required: true, default: 0 },
    numberOfWithdrawRequests: { type: Number, required: true, default: 0 },
    totalPaidAmount: { type: Number, required: true, default: 0 },
    totalWithdraw: { type: Number, required: true, default: 0 },
}, {
    timestamps: true
});

const Wallet = model<IWallet>('Wallet', WalletSchema);

export default Wallet;