import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import Mechanic from "../Mechanic/mechanic.model";
import Order from "../Order/order.model";
import { UserModel } from "../user/user.model";
import Vehicle from "../Vehicle/vehicle.model";
import Withdraw from "../Withdraw/withdraw.model";
import Admin from "./admin.model";
import Wallet from "../Wallet/wallet.model";
import mongoose from "mongoose";

export const getOverviewFromDB = async () => {
    const totalOrders = await Order.countDocuments();
    const totalVehicles = await Vehicle.countDocuments();
    const totalMechanics = await Mechanic.countDocuments();
    const totalUsers = await UserModel.countDocuments();

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
    const session = await mongoose.startSession();  // Start a session

    try {
        session.startTransaction();  // Start a new transaction

        // 1. Update the withdraw request status to "completed"
        const withdraw = await Withdraw.findOneAndUpdate(
            { user: mechanicId },
            { status: "completed" },
            { session }
        );

        if (!withdraw) {
            throw new AppError(httpStatus.NOT_FOUND, "Withdraw request not found");
        }

        // 2. Update the mechanic's wallet: deduct the amount from available balance and add to withdrawn amount
        const mechanicWallet = await Wallet.findOneAndUpdate(
            { user: mechanicId },
            {
                $inc: {
                    availableBalance: -(withdraw?.amount ?? 0),
                    withdrawnAmount: withdraw?.amount
                }
            },
            { session, new: true }
        );

        if (!mechanicWallet) {
            throw new AppError(httpStatus.NOT_FOUND, "No wallet found for this mechanic");
        }

        // 3. Update the admin's wallet: increase the total paid amount by the withdraw amount
        const adminWallet = await Admin.updateOne(
            { role: "admin" },
            { $inc: { totalPaidAmount: withdraw?.amount } },
            { session }
        );

        if (adminWallet.modifiedCount === 0) {
            throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update admin wallet");
        }

        // Commit the transaction if all operations succeed
        await session.commitTransaction();

        return adminWallet;
    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        throw error;  // Re-throw the error so it can be caught by the caller
    } finally {
        session.endSession();  // End the session
    }
};