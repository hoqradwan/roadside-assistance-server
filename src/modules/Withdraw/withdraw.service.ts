// totalWithdrawRequests: { type: Number, required: true, default: 0 },
// totalPaidAmount: { type: Number, required: true, default: 0 },

import Withdraw from "./withdraw.model";

export const createWithdrawIntoDB = async (amount : number, id : string) =>{
    const withdraw = new Withdraw({
        amount,
        user : id
    });
    await withdraw.save();
    return withdraw;
}
