import { Schema, model } from 'mongoose';

export interface IPaymentMethod {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
}

const paymentMethodSchema = new Schema<IPaymentMethod>({
    bankName: {
        type: String,
        required: true,
        trim: true,
    },
    accountHolderName: {
        type: String,
        required: true,
        trim: true,
    },
    accountNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
}, {
    timestamps: true,
});

const PaymentMethod = model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;