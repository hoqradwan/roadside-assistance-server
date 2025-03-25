import { Jwt } from "jsonwebtoken";
import { IMechanic } from "../Mechanic/mechanic.model";
import Order, { IOrder } from "./order.model";
import { IUser } from "../user/user.interface";
import Wallet from "../Wallet/wallet.model";
import { Commission } from "../Commission/commission.model";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

export const createOrderIntoDB = async (orderData: IOrder) => {
    const order = await Order.create(orderData);
    return order;
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
    const order = await Order.findByIdAndUpdate(orderId, { status: 'completed' }, { new: true });
    if (!order) {
        throw new AppError(httpStatus.NOT_FOUND, "Order does not exist");
    }
    const commission = await Commission.findOne({ applicable: "mechanic" });
    const earning = (order?.total ?? 0) - (commission?.amount ?? 0);
    const mechanicWallet = await Wallet.findByIdAndUpdate(
        mechanicId,
        {
            $inc: {
                totalEarnings: earning,
                availableBalance: earning
            }
        },
        { new: true }
    );
    return mechanicWallet;
}