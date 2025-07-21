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
import { PaymentModel } from "../payment/payment.model";

export const getOverviewFromDB = async () => {
    const totalOrders = await Order.countDocuments();
    const totalVehicles = await Vehicle.countDocuments();
    const totalMechanics = await Mechanic.countDocuments();
    const totalUsers = await UserModel.countDocuments();
    const totalEarnings = await Admin.findOne({ role: "admin" }, { totalEarnings: 1 });
    return {
        totalOrders,
        totalVehicles,
        totalMechanics,
        totalUsers,
        totalEarnings: totalEarnings?.totalEarnings || 0,
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

export const getAnalyticsDataFromDB = async () => {
    // Fetch total sales (total number of completed orders)
    const totalSales = await Order.countDocuments({ status: "completed" });
  
    // Fetch total earnings (admin's total earnings)
    const totalEarnings = await Admin.findOne({ role: "admin" }, { totalEarnings: 1 });
  
    // Fetch user activity (number of users registered per month)
    const userActivity = await UserModel.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  
    // Fetch mechanic activity (number of orders completed by mechanics per month)
    const mechanicActivity = await Order.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: { $month: "$completedAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  
    // Prepare the analytics data for frontend
    const analyticsData = {
      totalSales,
      totalEarnings: totalEarnings?.totalEarnings || 0,
      userActivity: userActivity.map((item) => ({
        month: item._id,
        count: item.count,
      })),
      mechanicActivity: mechanicActivity.map((item) => ({
        month: item._id,
        count: item.count,
      })),
    };
  
    return analyticsData;
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
export const getEarningsGraphChartFromDB = async (
  period: 'weekly' | 'monthly' | 'yearly',
  year?: number,
  month?: number
) => {
  let earningsData: { name: string; totalEarnings: number }[] = [];
  let startDate: Date;
  let endDate: Date;
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month !== undefined ? month - 1 : new Date().getMonth();
 
  if (period === 'yearly') {
    // Show data for 11 years (5 years before and 5 years after the current year)
    const yearRange = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    startDate = new Date(currentYear - 5, 0, 1); // Start from 5 years before
    endDate = new Date(currentYear + 5, 11, 31); // End at 5 years after
    earningsData = yearRange.map(year => ({
      name: year.toString(),
      totalEarnings: 0,
    }));
  } else if (period === 'monthly') {
    // Show data for each month of the selected year
    startDate = new Date(currentYear, 0, 1); // January 1 of selected year
    endDate = new Date(currentYear, 11, 31); // December 31 of selected year
    earningsData = monthNames.map(month => ({ name: month, totalEarnings: 0 }));
  } else if (period === 'weekly') {
    // Show data for weeks in the selected month
    if (!month) {
      throw new Error('Month is required for weekly period.');
    }
    startDate = new Date(currentYear, currentMonth, 1);
    endDate = new Date(currentYear, currentMonth + 1, 0);
    // Calculate week ranges for the selected month
    const weeks: { name: string; start: number; end: number }[] = [];
    let currentDate = 1;
    while (currentDate <= endDate.getDate()) {
      const weekStart = currentDate;
      const weekEnd = Math.min(currentDate + 6, endDate.getDate());
      const startFormatted = new Date(
        currentYear,
        currentMonth,
        weekStart
      ).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const endFormatted = new Date(
        currentYear,
        currentMonth,
        weekEnd
      ).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      weeks.push({
        name: `${startFormatted} - ${endFormatted}`,
        start: weekStart,
        end: weekEnd,
      });
      currentDate += 7;
    }
    earningsData = weeks.map(week => ({ name: week.name, totalEarnings: 0 }));
  } else {
    throw new Error("Invalid period. Use 'weekly', 'monthly', or 'yearly'.");
  }
 
  const payments = await PaymentModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id:
          period === 'weekly'
            ? {
                $subtract: [
                  { $divide: [{ $dayOfMonth: '$createdAt' }, 7] },
                  {
                    $mod: [{ $divide: [{ $dayOfMonth: '$createdAt' }, 7] }, 1],
                  },
                ],
              }
            : period === 'monthly'
            ? { $month: '$createdAt' }
            : { $year: '$createdAt' },
        totalEarnings: { $sum: '$totalPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
 
  payments.forEach(payment => {
    if (period === 'weekly') {
      const weekIndex = Math.min(
        Math.floor(payment._id),
        earningsData.length - 1
      );
      if (earningsData[weekIndex]) {
        earningsData[weekIndex].totalEarnings = payment.totalEarnings; // No conversion, already in euros
        console.log(
          `Matched weekly payment: Week ${weekIndex + 1}, Earnings: ${
            payment.totalEarnings
          }`
        );
      }
    } else if (period === 'monthly') {
      const monthIndex = payment._id - 1; // MongoDB $month is 1-based
      if (earningsData[monthIndex]) {
        earningsData[monthIndex].totalEarnings = payment.totalEarnings; // No conversion, already in euros
        console.log(
          `Matched monthly payment: Month ${monthNames[monthIndex]}, Earnings: ${payment.totalEarnings}`
        );
      }
    } else if (period === 'yearly') {
      const yearIndex = earningsData.findIndex(
        year => Number(year.name) === payment._id
      );
      if (yearIndex !== -1) {
        earningsData[yearIndex].totalEarnings = payment.totalEarnings; // No conversion, already in euros
        console.log(
          `Matched yearly payment: Year ${payment._id}, Earnings: ${payment.totalEarnings}`
        );
      }
    }
  });
 
  console.log('Final Earnings Data:', earningsData);
 
  return { earnings: earningsData, period };
};