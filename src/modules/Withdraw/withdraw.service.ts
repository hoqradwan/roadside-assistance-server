// totalWithdrawRequests: { type: Number, required: true, default: 0 },
// totalPaidAmount: { type: Number, required: true, default: 0 },

import Mechanic from "../Mechanic/mechanic.model";
import Wallet from "../Wallet/wallet.model";
import Withdraw from "./withdraw.model";

export const createWithdrawIntoDB = async (amount: number, id: string) => {
    const mechanicWallet = await Wallet.findOne({ user: id });
    if (!mechanicWallet) {
        throw new Error('No money in this mechanic account');
    }
    if (mechanicWallet.availableBalance < amount) {
        throw new Error('Not enough money to withdraw');
    }
    const withdraw = new Withdraw({
        amount,
        user: id
    });
    await withdraw.save();
    return withdraw;
}
export const markAsPaidIntoDB = async (mechanicId: string) => {
    const result = await Withdraw.findByIdAndUpdate(mechanicId, { status: 'completed' }, { new: true });
    return result;
}
export const getAllWithdrawRequestsFromDB = async () => {
    const mechanicWithdraw = await Withdraw.find().lean();
    const mechanicWithdrawWithServiceCount = await Promise.all(
        mechanicWithdraw.map(async (withdraw) => {
            const mechanic = await Mechanic.findOne({ user: withdraw.user }).lean();
            const serviceCount = mechanic?.serviceCount || 0;
            return {
                ...withdraw,
                serviceCount
            };
        })
    );
    return mechanicWithdrawWithServiceCount;
};