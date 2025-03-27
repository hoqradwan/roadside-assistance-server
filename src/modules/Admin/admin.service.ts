import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import Mechanic from "../Mechanic/mechanic.model";
import Order from "../Order/order.model";
import { UserModel } from "../user/user.model";
import Vehicle from "../Vehicle/vehicle.model";
import Withdraw from "../Withdraw/withdraw.model";
import Admin from "./admin.model";
import Wallet from "../Wallet/wallet.model";

export const getOverviewFromDB = async () => {
    const totalOrders = await Order.countDocuments();
    const totalVehicles = await Vehicle.countDocuments();
    const totalMechanics = await Mechanic.countDocuments();
    const totalUsers = await UserModel.countDocuments();

    // Calculate total revenue (sum of all revenues)
    // const totalRevenueResult = await Revenue.aggregate([
    //   { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
    // ]);
    // const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].totalRevenue : 0;

    return {
        totalOrders,
        totalVehicles,
        totalMechanics,
        totalUsers,
    }
}
export const getAdminWalletOverviewFromDB = async () => {
    // Find admin record
    const result = await Admin.findOne({ role: "admin" });

    // If admin not found, throw an error
    if (!result) {
        throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
    }

    // Count the number of withdraw requests with status "processing"
    const totalWithdrawRequests = await Withdraw.countDocuments({ status: "processing" });

    // Prepare the final data by merging the admin data and the count of withdraw requests
    const adminWalletOverviewData = {
        ...result.toObject(),
        totalWithdrawRequests,
    };

    return adminWalletOverviewData;
};


export const acceptWithdrawRequestIntoDB = async (mechanicId: string) => {
    const withdraw = await Withdraw.findOneAndUpdate({ user: mechanicId }, { status: "completed" });
    if (!withdraw) {
        throw new AppError(httpStatus.NOT_FOUND, "Withdraw request not found");
    }
    await Wallet.findOneAndUpdate({ user: mechanicId }, {
        $inc: {
            availableBalance: -(withdraw?.amount ?? 0),
            withdrawnAmount: withdraw?.amount
        }
    })
    const adminWallet = await Admin.updateOne({ role: "admin" }, {
        $inc: {
            totalPaidAmount: withdraw?.amount
        }
    })
    return adminWallet;
}