import Mechanic from "../Mechanic/mechanic.model";
import { MechanicServiceRateModel } from "../MechanicServiceRate/mechanicServiceRate.model";
import { UserModel } from "../user/user.model";
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
            const mechanic = await Mechanic.findOne({ user: withdraw.user }).populate({ path: "user", select: "name" }).select("uniqueMechanicId").lean();
            const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: withdraw.user });
            const serviceCount = mechanicServiceRate?.services.length;
            return {
                ...withdraw,
                mechanic,
                serviceCount
            };
        })
    );
    return mechanicWithdrawWithServiceCount;
};

export const getAllWithdrawRequestsByMechanic = async (mechanicId: string) => {
    const mechanic = await UserModel.findById(mechanicId);
    if (!mechanic) {
        throw new Error("Mechanic not found");
    }
    const withdrawRequests = await Withdraw.find({user : mechanicId});
    return withdrawRequests;
}