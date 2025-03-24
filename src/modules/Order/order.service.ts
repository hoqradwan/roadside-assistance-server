import { Jwt } from "jsonwebtoken";
import { IMechanic } from "../Mechanic/mechanic.model";
import Order, { IOrder } from "./order.model";
import { IUser } from "../user/user.interface";

export const createOrderIntoDB = async (orderData: IOrder) => {
    const order = await Order.create(orderData);
    return order;
}
export const getOrdersByStatusFromDB = async (status: string, userData : Partial<IUser>) => {
    const userId = userData?.id;  // The logged-in user's ID
    let pendingCount, processingCount, completedCount

    // If the user is an admin, they can fetch orders for any mechanic
    if (userData.role === 'admin') {
        const order = await Order.find({ status });
         pendingCount = await Order.countDocuments({ status: 'pending' });
         processingCount = await Order.countDocuments({ status: 'processing' });
         completedCount = await Order.countDocuments({ status: 'completed' });
        return {order , pendingCount, processingCount, completedCount};
    }

    // If the user is a mechanic, they can only fetch their own orders
    if (userData.role === 'mechanic') {
        const order = await Order.find({ status, mechanic : userId });
        pendingCount = await Order.countDocuments({ status: 'pending' });
        processingCount = await Order.countDocuments({ status: 'processing' });
        completedCount = await Order.countDocuments({ status: 'completed' });
        return {order , pendingCount, processingCount, completedCount};
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