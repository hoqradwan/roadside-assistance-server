import Order, { IOrder } from "./order.model";
import { IUser } from "../user/user.interface";
import Wallet from "../Wallet/wallet.model";
import { Commission } from "../Commission/commission.model";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import Admin from "../Admin/admin.model";
import paginationBuilder from "../../utils/paginationBuilder";

export const createOrderIntoDB = async (orderData: IOrder) => {
    const order = await Order.create(orderData);
    return order;
}
export const getOrdersFromDB = async ({
    currentPage,
    limit,
}: {
    currentPage: number;
    limit: number;
}) => {
    const totalData = await Order.countDocuments();

    // Use paginationBuilder to get pagination details
    const paginationInfo = paginationBuilder({
        totalData,
        currentPage,
        limit,
    });
    const orders = await Order.find({}).skip((currentPage - 1) * limit).limit(limit);;
    return { paginationInfo, data: orders };
}
export const getOrdersByStatusFromDB = async (status: string, userData: Partial<IUser>) => {
    const userId = userData?.id;  // The logged-in user's ID
    let pendingCount, processingCount, completedCount

    // If the user is an admin, they can fetch orders for any mechanic
    if (userData.role === 'admin') {
        const order = await Order.find({ status });
        pendingCount = await Order.countDocuments({ status: 'pending' });
        processingCount = await Order.countDocuments({ status: 'processing' });
        completedCount = await Order.countDocuments({ status: 'completed' });
        return { order, pendingCount, processingCount, completedCount };
    }

    // If the user is a mechanic, they can only fetch their own orders
    if (userData.role === 'mechanic') {
        const order = await Order.find({ status, mechanic: userId });
        pendingCount = await Order.countDocuments({ status: 'pending' });
        processingCount = await Order.countDocuments({ status: 'processing' });
        completedCount = await Order.countDocuments({ status: 'completed' });
        return { order, pendingCount, processingCount, completedCount };
    }


}
export const getOrdersByMechanicFromDB = async (mechanicid: string, userData: Partial<IUser>) => {
    const userId = userData?.id;  // The logged-in user's ID

    let query = {};

    // If the user is an admin, they can fetch orders for any mechanic
    if (userData.role === 'admin') {
        query = { mechanic: mechanicid };  // Admin can access orders for any mechanic
    }

    // If the user is a mechanic, they can only fetch their own orders
    if (userData.role === 'mechanic') {
        query = { mechanic: userId };
    }

    // Fetch orders based on the query
    const orders = await Order.find(query);
    return orders;
}

export const markAsCompleteIntoDB = async (orderId: string, mechanicId: string) => {
    const order = await Order.findOne({ _id: orderId, mechanic: mechanicId });

    // Check if order exists
    if (!order) {
        throw new AppError(httpStatus.NOT_FOUND, "Order does not exist or does not belong to this mechanic");
    }
    if (order.status === "completed") {
        throw new AppError(httpStatus.BAD_REQUEST, "Order is already completed");
    }

    const mechanicWallet = await Wallet.findOne({ user: mechanicId });
    if (!mechanicWallet) {
        await Wallet.create({ user: mechanicId });
    }
    await Order.findByIdAndUpdate(orderId, { status: "completed" }, { new: true })
    // Find the commission
    const commission = await Commission.findOne({ applicable: "mechanic" });

    // Ensure commission exists
    if (!commission) {
        throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
    }
    let earning, commissionUser, profitTotal;
    const orderTotal = order?.total;
    if (commission.type === "number") {
        // Calculate earnings
        earning = (order?.total ?? 0) - (commission?.amount ?? 0);
        commissionUser = await Commission.findOne({ applicable: "user" });
        if (commissionUser?.type === "number") {
            profitTotal = (commission.amount ?? 0) + (commissionUser?.amount ?? 0);
            await Admin.findOneAndUpdate({ role: "admin" }, {
                $inc: {
                    totalEarnings: orderTotal,
                    profit: profitTotal
                }
            })
        } else if (commissionUser?.type === "percentage") {
            const userProfit = (order.total * (commissionUser?.amount ?? 0)) / 100
            profitTotal = (commission.amount ?? 0) + userProfit;
            await Admin.findOneAndUpdate({ role: "admin" }, {
                $inc: {
                    totalEarnings: orderTotal,
                    profit: profitTotal
                }
            })
        }

    } else if (commission.type === "percentage") {
        const commissionPercentageToNumber = ((commission?.amount ?? 0) / 100) * order?.total;
        earning = (order?.total ?? 0) - commissionPercentageToNumber;
        commissionUser = await Commission.findOne({ applicable: "user" });
        if (commissionUser?.type === "number") {
            profitTotal = commissionPercentageToNumber + (commissionUser?.amount ?? 0);
            await Admin.findOneAndUpdate({ role: "admin" }, {
                $inc: {
                    totalEarnings: orderTotal,
                    profit: profitTotal
                }
            })
        } else if (commissionUser?.type === "percentage") {
            const commissionPercentageToNumber = ((commission?.amount ?? 0) / 100) * orderTotal;
            const userCommissionPercentageToNumber = (commissionUser?.amount / 100) * orderTotal
            profitTotal = commissionPercentageToNumber + userCommissionPercentageToNumber;
            await Admin.findOneAndUpdate({ role: "admin" }, {
                $inc: {
                    totalEarnings: orderTotal,
                    profit: profitTotal
                }
            })
        }

    }


    // Update the wallet with the calculated earning
    const updatedWallet = await Wallet.findOneAndUpdate(
        { user: mechanicId },
        {
            $inc: {
                totalEarnings: earning,
                availableBalance: earning
            }
        },
        { new: true }
    );

    // Check if the wallet was updated successfully
    if (!updatedWallet) {
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update wallet");
    }

    // Return the updated wallet
    return updatedWallet;
};
