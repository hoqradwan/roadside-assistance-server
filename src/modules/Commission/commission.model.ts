import * as mongoose from 'mongoose';

export interface Commission {
    type: string;
    applicable: boolean;
    amount: number;
}
const CommissionSchema = new mongoose.Schema({
    type: { type: String, enum: ['percentage', 'number'], required: true },
    applicable: { type: String, enum: ['user', 'mechanic'], required: true },
    amount: { type: Number, required: true }
},{
    timestamps : true
});

export const CommissionModel = mongoose.model('Commission', CommissionSchema);