import Order, { IOrder } from "./order.model";

export const createOrderIntoDB = async (orderData:IOrder) => {
    const order = await Order.create(orderData);
    return order;
}