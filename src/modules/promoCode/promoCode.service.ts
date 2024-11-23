import { IPromoCode } from "./promoCode.interface"; // Import the IPromoCode interface
import { PromoCodeModel } from "./promoCode.model";

export const findPromoCodeByCode = async (
  code: string,
): Promise<IPromoCode | null> => {
  return await PromoCodeModel.findOne({ code });
};

export const promoCodeCreate = async (promoCodeData: {
  code: string;
  duration: string;
}): Promise<IPromoCode> => {
  const promoCode = await PromoCodeModel.create(promoCodeData);
  return promoCode.toObject() as IPromoCode; // Convert to plain object
};

// export const promoCodesList = async (
//   page: number = 1,
//   limit: number = 10,
//   date?: string,
//   duration?: string
// ): Promise<{ promoCodes: IPromoCode[], totalPromoCodes: number, totalPages: number }> => {

//   const skip = (page - 1) * limit;
//   const query: any = { isDeleted: { $ne: true } }; // Filter out promo codes where isDeleted is true

//   if (duration) {
//     query.duration = duration; // Add duration to the query
//   }

//   // Date filtering logic
//   if (date) {
//     // Parse the input date (DD-MM-YYYY)
//     const [day, month, year] = date.split("-").map(Number);

//     // Create start and end Date objects
//     const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Start of the day (00:00:00 UTC)
//     const endDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, -1)); // End of the day (23:59:59 UTC)

//     // Add date filter to query
//     query.createdAt = { $gte: startDate, $lte: endDate };
//   }

//   // Query for promo codes with pagination and filtering
//   const promoCodes = await PromoCodeModel.aggregate<IPromoCode>([
//     { $match: query },
//     {
//       $setWindowFields: {
//         sortBy: { createdAt: -1 },
//         output: {
//           serial: {
//             $documentNumber: {}
//           }
//         }
//       }
//     },
//     {
//       $addFields: {
//         numericDuration: { $toInt: "$duration" } // Convert string to integer directly
//       }
//     },
//     {
//       $addFields: {
//         formattedDuration: {
//           $cond: {
//             if: { $lte: ['$numericDuration', 12] },
//             then: {
//               $concat: [
//                 { $toString: '$numericDuration' }, ' ',
//                 { $cond: { if: { $eq: ['$numericDuration', 1] }, then: 'month', else: 'months' } }
//               ]
//             },
//             else: {
//               $let: {
//                 vars: {
//                   years: { $floor: { $divide: ['$numericDuration', 12] } },
//                   months: { $mod: ['$numericDuration', 12] }
//                 },
//                 in: {
//                   $concat: [
//                     { $toString: '$$years' }, ' year', { $cond: { if: { $eq: ['$$years', 1] }, then: '', else: 's' } },
//                     { $cond: { if: { $gt: ['$$months', 0] }, then: { $concat: [' ', { $toString: '$$months' }, ' month', { $cond: { if: { $eq: ['$$months', 1] }, then: '', else: 's' } }] }, else: '' } }
//                   ]
//                 }
//               }
//             }
//           }
//         }
//       }
//     },
//     {
//       $project: {
//         serial: 1,         // Include the serial field
//         code: 1,           // Include coupon code
//         status: 1,
//         subscription: 1,
//         duration: "$formattedDuration", // Use formattedDuration as duration
//         createdAt: 1,
//         activeDate: 1,
//         expiryDate:1// Include createdAt field
//       }
//     },
//     { $skip: skip },     // Skipping records for pagination
//     { $limit: limit },   // Limiting the number of records per page
//   ]);

//   // Get the total number of promo codes for calculating total pages
//   const totalPromoCodes = await PromoCodeModel.countDocuments(query);
//   const totalPages = Math.ceil(totalPromoCodes / limit);

//   return { promoCodes, totalPromoCodes, totalPages };
// };
//with out spanish language
// export const promoCodesList = async (
//   page: number = 1,
//   limit: number = 10,
//   date?: string,
//   duration?: string,
// ): Promise<{
//   promoCodes: IPromoCode[];
//   totalPromoCodes: number;
//   totalPages: number;
// }> => {
//   const skip = (page - 1) * limit;
//   const query: any = { isDeleted: { $ne: true } }; // Filter out promo codes where isDeleted is true

//   if (duration) {
//     query.duration = duration; // Add duration to the query
//   }

//   // Date filtering logic
//   if (date) {
//     // Parse the input date (DD-MM-YYYY)
//     const [day, month, year] = date.split("-").map(Number);

//     // Create start and end Date objects
//     const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Start of the day (00:00:00 UTC)
//     const endDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, -1)); // End of the day (23:59:59 UTC)

//     // Add date filter to query
//     query.createdAt = { $gte: startDate, $lte: endDate };
//   }

//   // Query for promo codes with pagination and filtering
//   const promoCodes = await PromoCodeModel.aggregate<IPromoCode>([
//     { $match: query },
//     {
//       $setWindowFields: {
//         sortBy: { createdAt: -1 },
//         output: {
//           serial: {
//             $documentNumber: {},
//           },
//         },
//       },
//     },
//     {
//       $addFields: {
//         numericDuration: { $toInt: "$duration" }, // Convert string to integer directly
//       },
//     },
//     {
//       $addFields: {
//         formattedDuration: {
//           $cond: {
//             if: { $lte: ["$numericDuration", 12] },
//             then: {
//               $concat: [
//                 { $toString: "$numericDuration" },
//                 " ",
//                 {
//                   $cond: {
//                     if: { $eq: ["$numericDuration", 1] },
//                     then: "month",
//                     else: "months",
//                   },
//                 },
//               ],
//             },
//             else: {
//               $let: {
//                 vars: {
//                   years: { $floor: { $divide: ["$numericDuration", 12] } },
//                   months: { $mod: ["$numericDuration", 12] },
//                 },
//                 in: {
//                   $concat: [
//                     { $toString: "$$years" },
//                     " year",
//                     {
//                       $cond: {
//                         if: { $eq: ["$$years", 1] },
//                         then: "",
//                         else: "s",
//                       },
//                     },
//                     {
//                       $cond: {
//                         if: { $gt: ["$$months", 0] },
//                         then: {
//                           $concat: [
//                             " ",
//                             { $toString: "$$months" },
//                             " month",
//                             {
//                               $cond: {
//                                 if: { $eq: ["$$months", 1] },
//                                 then: "",
//                                 else: "s",
//                               },
//                             },
//                           ],
//                         },
//                         else: "",
//                       },
//                     },
//                   ],
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//     {
//       $project: {
//         serial: 1, // Include the serial field
//         code: 1, // Include coupon code
//         status: 1,
//         subscription: 1,
//         duration: "$formattedDuration", // Use formattedDuration as duration
//         createdAt: {
//           $dateToString: {
//             format: "%d %B %Y",
//             date: "$createdAt",
//             timezone: "UTC",
//           },
//         }, // Format createdAt
//         activeDate: {
//           $cond: {
//             if: { $not: [{ $ifNull: ["$activeDate", false] }] }, // Check if activeDate exists
//             then: null,
//             else: {
//               $dateToString: {
//                 format: "%d %B %Y",
//                 date: "$activeDate",
//                 timezone: "UTC",
//               },
//             },
//           },
//         },
//         expiryDate: {
//           $cond: {
//             if: { $not: [{ $ifNull: ["$expiryDate", false] }] }, // Check if expiryDate exists
//             then: null,
//             else: {
//               $dateToString: {
//                 format: "%d %B %Y",
//                 date: "$expiryDate",
//                 timezone: "UTC",
//               },
//             },
//           },
//         },
//       },
//     },
//     { $skip: skip }, // Skipping records for pagination
//     { $limit: limit }, // Limiting the number of records per page
//   ]);

//   // Get the total number of promo codes for calculating total pages
//   const totalPromoCodes = await PromoCodeModel.countDocuments(query);
//   const totalPages = Math.ceil(totalPromoCodes / limit);

//   return { promoCodes, totalPromoCodes, totalPages };
// };
//with spanish language
export const promoCodesList = async (
  page: number = 1,
  limit: number = 10,
  date?: string,
  duration?: string,
): Promise<{
  promoCodes: IPromoCode[];
  totalPromoCodes: number;
  totalPages: number;
}> => {
  const skip = (page - 1) * limit;
  const query: any = { isDeleted: { $ne: true } }; // Filter out promo codes where isDeleted is true

  if (duration) {
    query.duration = duration; // Add duration to the query
  }

  // Date filtering logic
  if (date) {
    // Parse the input date (DD-MM-YYYY)
    const [day, month, year] = date.split("-").map(Number);

    // Create start and end Date objects
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Start of the day (00:00:00 UTC)
    const endDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, -1)); // End of the day (23:59:59 UTC)

    // Add date filter to query
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  // Query for promo codes with pagination and filtering
  const promoCodes = await PromoCodeModel.aggregate<IPromoCode>([
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
                    " ",
                    {
                      $cond: {
                        if: { $eq: ["$$years", 1] },
                        then: "year",
                        else: "years",
                      },
                    },
                    {
                      $cond: {
                        if: { $gt: ["$$months", 0] },
                        then: {
                          $concat: [
                            " ",
                            { $toString: "$$months" },
                            " ",
                            {
                              $cond: {
                                if: { $eq: ["$$months", 1] },
                                then: "month",
                                else: "months",
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
        code: 1, // Include coupon code
        status: 1,
        subscription: 1,
        duration: "$formattedDuration", // Use formattedDuration as duration
        createdAt: {
          $dateToString: {
            format: "%d %B %Y",
            date: "$createdAt",
            timezone: "UTC",
          },
        }, // Format createdAt
        activeDate: {
          $cond: {
            if: { $not: [{ $ifNull: ["$activeDate", false] }] }, // Check if activeDate exists
            then: null,
            else: {
              $dateToString: {
                format: "%d %B %Y",
                date: "$activeDate",
                timezone: "UTC",
              },
            },
          },
        },
        expiryDate: {
          $cond: {
            if: { $not: [{ $ifNull: ["$expiryDate", false] }] }, // Check if expiryDate exists
            then: null,
            else: {
              $dateToString: {
                format: "%d %B %Y",
                date: "$expiryDate",
                timezone: "UTC",
              },
            },
          },
        },
      },
    },
    { $skip: skip }, // Skipping records for pagination
    { $limit: limit }, // Limiting the number of records per page
  ]);

  // Get the total number of promo codes for calculating total pages
  const totalPromoCodes = await PromoCodeModel.countDocuments(query);
  const totalPages = Math.ceil(totalPromoCodes / limit);

  return { promoCodes, totalPromoCodes, totalPages };
};

export const findPromoCodeById = async (
  id: string,
): Promise<IPromoCode | null> => {
  const promoCode = await PromoCodeModel.findById(id);
  return promoCode ? (promoCode.toObject() as IPromoCode) : null; // Convert to plain object
};

export const promoCodeUpdate = async (
  id: string,
  updateData: { code?: string; status?: string; duration?: string },
): Promise<IPromoCode | null> => {
  const updatedPromoCode = await PromoCodeModel.findByIdAndUpdate(
    id,
    updateData,
    { new: true },
  );
  return updatedPromoCode ? (updatedPromoCode.toObject() as IPromoCode) : null; // Convert to plain object
};

export const promoCodeDelete = async (promoId: string): Promise<void> => {
  await PromoCodeModel.findByIdAndUpdate(promoId, { isDeleted: true });
};
export const promoCodeRestore = async (promoId: string): Promise<void> => {
  await PromoCodeModel.findByIdAndUpdate(promoId, { isDeleted: false });
};
