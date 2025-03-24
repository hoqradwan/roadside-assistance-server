import Mechanic from "../Mechanic/mechanic.model";
import Order from "../Order/order.model";
import { UserModel } from "../user/user.model";
import Vehicle from "../Vehicle/vehicle.model";

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
