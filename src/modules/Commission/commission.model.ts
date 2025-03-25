import * as mongoose from 'mongoose';
import { ICommission } from './commission.interface';


const CommissionSchema = new mongoose.Schema<ICommission>({
    type: { type: String, enum: ['percentage', 'number'], required: true },
    applicable: { type: String, enum: ['user', 'mechanic'], required: true },
    amount: { type: Number, required: true }
},{
    timestamps : true
});

export const Commission = mongoose.model('Commission', CommissionSchema);