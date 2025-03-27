import { Schema, model, Document } from 'mongoose';

// interface Admin extends Document {
//     name: string;
//     email: string;
//     password: string;
//     role: string;
//     createdAt: Date;
//     updatedAt: Date;
// }

interface Admin extends Document {
    totalEarnings: number;
    TotalPaidAmount: number;
    profit: number;
    totalWithdraw: number;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema = new Schema(
    {
        totalEarnings: { type: Number, required: true, default: 0 },
        totalPaidAmount: { type: Number, required: true, default: 0 },
        profit: { type: Number, required: true, default: 0 },
        totalWithdraw: { type: Number, required: true, default: 0 },
        role: { type: String, default: 'admin' },
    },
    {
        timestamps: true,
    }
);

const Admin = model<Admin>('Admin', AdminSchema);

export default Admin;