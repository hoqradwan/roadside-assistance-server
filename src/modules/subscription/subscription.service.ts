import { ISubscription } from "./subscription.interface";
import { SubscriptionModel } from "./subscription.model";

export const subscriptionList = async (
  page: number = 1,
  limit: number = 10,
): Promise<{
  subscriptions: ISubscription[];
  totalSubscriptions: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;
  const query: any = { isDeleted: { $ne: true } }; // Filter out deleted subscriptions

  // Query for subscriptions with pagination
  const subscriptions = await SubscriptionModel.aggregate<ISubscription>([
    { $match: query },
    {
      $setWindowFields: {
        sortBy: { createdAt: -1 },
        output: {
          serial: {
            $documentNumber: {},
          },
        },
      },
    },
    {
      $addFields: {
        numericDuration: { $toInt: "$duration" }, // Convert string to integer directly
      },
    },
    {
      $addFields: {
        formattedDuration: {
          $cond: {
            if: { $lte: ["$numericDuration", 12] },
            then: {
              $concat: [
                { $toString: "$numericDuration" },
                " ",
                {
                  $cond: {
                    if: { $eq: ["$numericDuration", 1] },
                    then: "month",
                    else: "months",
                  },
                },
              ],
            },
            else: {
              $let: {
                vars: {
                  years: { $floor: { $divide: ["$numericDuration", 12] } },
                  months: { $mod: ["$numericDuration", 12] },
                },
                in: {
                  $concat: [
                    { $toString: "$$years" },
                    " year",
                    {
                      $cond: {
                        if: { $eq: ["$$years", 1] },
                        then: "",
                        else: "s",
                      },
                    },
                    {
                      $cond: {
                        if: { $gt: ["$$months", 0] },
                        then: {
                          $concat: [
                            " ",
                            { $toString: "$$months" },
                            " month",
                            {
                              $cond: {
                                if: { $eq: ["$$months", 1] },
                                then: "",
                                else: "s",
                              },
                            },
                          ],
                        },
                        else: "",
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        serial: 1, // Include the serial field
        name: 1, // Include subscription name
        price: 1, // Include price
        duration: "$formattedDuration", // Use formattedDuration as duration
        createdAt: 1, // Include createdAt field
      },
    },
    { $skip: skip }, // Skipping records for pagination
    { $limit: limit }, // Limiting the number of records per page
  ]);

  // Get the total number of subscriptions for calculating total pages
  const totalSubscriptions = await SubscriptionModel.countDocuments(query);
  const totalPages = Math.ceil(totalSubscriptions / limit);

  //console.log(subscriptions); // Log the result for debugging

  return { subscriptions, totalSubscriptions, totalPages };
};

export const findSubsById = async (
  id: string,
): Promise<ISubscription | null> => {
  const subscription = await SubscriptionModel.findById(id);
  return subscription ? (subscription.toObject() as ISubscription) : null; // Convert to plain object
};

export const subsUpdate = async (
  id: string,
  updateData: { name?: string; price?: string; duration?: string },
): Promise<ISubscription | null> => {
  const updatedSubs = await SubscriptionModel.findByIdAndUpdate(
    id,
    updateData,
    { new: true },
  );
  return updatedSubs ? (updatedSubs.toObject() as ISubscription) : null; // Convert to plain object
};

export const subsDelete = async (Id: string): Promise<void> => {
  await SubscriptionModel.findByIdAndUpdate(Id, { isDeleted: true });
};
