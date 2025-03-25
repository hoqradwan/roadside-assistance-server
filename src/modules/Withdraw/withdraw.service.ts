// totalWithdrawRequests: { type: Number, required: true, default: 0 },
// totalPaidAmount: { type: Number, required: true, default: 0 },

import Order from "../Order/order.model";
import Wallet from "../Wallet/wallet.model";
import Withdraw from "./withdraw.model";

export const createWithdrawIntoDB = async (amount : number, id : string) =>{
    const mechanicWallet = await Wallet.findOne({user : id});
    if(!mechanicWallet){
        throw new Error('No money in this mechanic account');
    }
    if(mechanicWallet.availableBalance < amount){
        throw new Error('Not enough money to withdraw');
    }
    const withdraw = new Withdraw({
        amount,
        user : id
    });
    await withdraw.save();
    return withdraw;
}
export const markAsPaidIntoDB = async (mechanicId : string) =>{
    const result = await Withdraw.findByIdAndUpdate(mechanicId, {status : 'completed'}, {new : true});
    return result;
}