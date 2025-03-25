import Order from "../Order/order.model";

export const getWalletOverviewFromDB = async () => {
    const result = await Order.aggregate([
        {
          $match: { status: 'completed' }  // Filter for completed orders
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: "$total" }
          }
        }
      ]);
      return {
        totalEarnings: result[0]?.totalEarnings || 0
      }
}