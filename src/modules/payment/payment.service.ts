import { IPaymentResult } from "./payment.interface";
import { PaymentModel } from "./payment.model";

export const getAllPaymentFromDB = async (
  page: number = 1,
  limit: number = 10,
  name?: string,
  date?: string,
): Promise<{ data: IPaymentResult[]; total: number }> => {
  const skip = (page - 1) * limit;
  const query: any = { isDeleted: false };

  if (name) {
    query["userDetails.name"] = { $regex: name, $options: "i" }; // Correct the field path for user name search
  }



  const payments = await PaymentModel.aggregate<IPaymentResult>([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

    { $match: query }, // Apply the query after $lookup and $unwind
    {
      $project: {
        transactionId: 1,
        amount: 1,
        createdAt: 1,
        userName: "$userDetails.name",
      },
    },
    { $sort: { date: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const totalPayments = await PaymentModel.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },


    { $match: query },
    { $count: "total" },
  ]);

  return { data: payments, total: totalPayments[0]?.total || 0 };
};
