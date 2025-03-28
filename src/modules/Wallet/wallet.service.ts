import Order from "../Order/order.model";
import Wallet from "./wallet.model";

export const getWalletOverviewFromDB = async (mechanicId: string) => {

  const totalCompletedOrder = await Order.find({ mechanic: mechanicId, status: "completed" }).countDocuments();

  // Fetch wallet information for the mechanic
  const mechanicWalletOverview = await Wallet.find({ user: mechanicId });

  // If the mechanic's wallet exists, merge the totalCompletedOrder into the wallet overview object
  if (mechanicWalletOverview.length > 0) {
    const updatedWalletOverview = {
      ...mechanicWalletOverview[0].toObject(), // Convert wallet document to plain object
      totalCompletedOrder: totalCompletedOrder, // Add totalCompletedOrder to the object
    };

    return updatedWalletOverview;
  }
}