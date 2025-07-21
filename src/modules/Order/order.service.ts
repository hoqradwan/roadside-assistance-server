import Order from "./order.model";
import { IUser } from "../user/user.interface";
import Wallet from "../Wallet/wallet.model";
import { Commission } from "../Commission/commission.model";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import Admin from "../Admin/admin.model";
import paginationBuilder from "../../utils/paginationBuilder";
import { UserModel } from "../user/user.model";
import Mechanic from "../Mechanic/mechanic.model";
import Vehicle from "../Vehicle/vehicle.model";
import Service from "../Service/service.model";
import { emitNotification } from "../../utils/socket";
import { NotificationModel } from "../notifications/notification.model";
import { MechanicServiceRateModel } from "../MechanicServiceRate/mechanicServiceRate.model";
import mongoose from "mongoose";
import { calculateDistance } from "./order.utils";
import { IPayment } from "../payment/payment.interface";

export const createOrderIntoDB = async (userId: string, orderData: any) => {
  // 1. Validate user exists
  const existingUser = await UserModel.findById(userId);
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // 2. Validate mechanic exists
  const existingMechanic = await UserModel.findById(orderData.mechanic);
  if (!existingMechanic) {
    throw new AppError(httpStatus.NOT_FOUND, "Mechanic not found");
  }

  // 3. Validate vehicle exists and belongs to the user
  const existingVehicle = await Vehicle.findById(orderData.vehicle);
  if (!existingVehicle) {
    throw new AppError(httpStatus.NOT_FOUND, "Vehicle not found");
  }


  // 4. Validate services exist
  const existingServices = await Service.find({ _id: { $in: orderData.services } });
  if (existingServices.length !== orderData.services.length) {
    throw new AppError(httpStatus.NOT_FOUND, "Some services not found");
  }

  // 5. Check if mechanic provides all requested services
  const mechanicServices = await MechanicServiceRateModel.find({
    mechanic: orderData.mechanic,
    "services.service": { $in: orderData.services }
  });

  if (mechanicServices.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, "Mechanic does not provide any of these services");
  }

  // Extract all service IDs that the mechanic actually provides
  const availableServiceIds = mechanicServices.flatMap(doc =>
    doc.services
      .filter(serviceObj => orderData.services.some((id: string) => id.toString() === serviceObj.service.toString()))
      .map(serviceObj => serviceObj.service.toString())
  );

  // Check if all requested services are available
  const uniqueAvailableServices = [...new Set(availableServiceIds)];
  const allServicesAvailable = orderData.services.every((serviceId: string) =>
    uniqueAvailableServices.includes(serviceId.toString())
  );

  if (!allServicesAvailable) {
    throw new AppError(httpStatus.NOT_FOUND, "Mechanic does not provide all requested services");
  }

  // 6. Calculate total price for the services
  const orderTotal = await MechanicServiceRateModel.aggregate([
    // Match documents for this specific mechanic
    {
      $match: {
        mechanic: new mongoose.Types.ObjectId(orderData.mechanic.toString())
      }
    },

    // Unwind the services array
    { $unwind: "$services" },

    // Match only the specific services we want
    {
      $match: {
        "services.service": {
          $in: orderData.services.map((id: string) => new mongoose.Types.ObjectId(id.toString()))
        }
      }
    },

    // Group and sum the prices
    {
      $group: {
        _id: null,
        total: { $sum: "$services.price" }
      }
    }
  ]);

  if (orderTotal.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, "No pricing found for the requested services");
  }

  let total = orderTotal[0].total;

  // 7. Apply commission/service charges
  const appService = await Commission.findOne({ applicable: "user" });
  if (appService) {
    if (appService.type === "number") {
      total += appService.amount;
    } else if (appService.type === "percentage") {
      total += (total + appService.amount) / 100;
    }
  }

  // 8. Validate minimum order amount if needed
  if (total < 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid order total");
  }
  let locationData = {
    type: "Point",
    coordinates: [0, 0] // default coordinates
  };

  // Check if coordinates are provided in the request
  if (orderData.coordinates && Array.isArray(orderData.coordinates) && orderData.coordinates.length === 2) {
    locationData.coordinates = orderData.coordinates;
  } else if (orderData.location && orderData.location.coordinates && Array.isArray(orderData.location.coordinates)) {
    locationData.coordinates = orderData.location.coordinates;
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, "Valid coordinates are required [longitude, latitude]");
  }

  // Validate coordinates are numbers
  if (!locationData.coordinates.every(coord => typeof coord === 'number' && !isNaN(coord))) {
    throw new AppError(httpStatus.BAD_REQUEST, "Coordinates must be valid numbers");
  }
  // 9. Create the order
  const finalOrderData = {
    ...orderData,
    location: locationData,
    user: userId,
    total: Math.round(total * 100) / 100, // Round to 2 decimal places
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 10. Create order in a transaction (optional but recommended)
  const session = await mongoose.startSession();
  let order;

  try {
    session.startTransaction();

    order = await Order.create([finalOrderData], { session });

    // You might want to update mechanic's order count or other related operations here
    // await Mechanic.findByIdAndUpdate(orderData.mechanic, { $inc: { totalOrders: 1 } }, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return order[0];
};

// export const makePaymentIntoDB = async (userId: string, orderId: string, paymentData: IPayment, // Added payment data
// ) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//         // Fetch the user
//         const user = await UserModel.findById(userId).session(session);
//         if (!user) {
//             throw new AppError(httpStatus.BAD_REQUEST, "User not found");
//         }

//         // Fetch the order
//         const order = await Order.findById(orderId).session(session);
//         if (!order) {
//             throw new AppError(httpStatus.BAD_REQUEST, "order not found");
//         }
//         payment = {
//                 transactionId: paymentData.transactionId,
//                 orderId, 
//                 user: userId,
//                 amount: order.total, // Use the booking's total price
//                 paymentDate: new Date(), // Use the current date for payment date
//                 status: 'completed', // Assuming the payment is successful
//                 isDeleted: false,
//             };

//             // Create the payment record
//             const createdPayment = await PaymentModel.create([payment], { session });
//             if (!createdPayment || createdPayment.length === 0) {
//                 throw new Error('Payment creation failed');
//             }
//             const payment = createdPayment[0];
//             const adminUser = await UserModel.findOne({role:"admin"}).session(session);
//             // Update the admin's total balance in Earning
//             await Wallet.findOneAndUpdate(
//                 { user: adminUser._id },
//                 { $inc: { totalBalance: order.total } },
//                 { new: true, upsert: true, session }
//             );


//         // Commit the transaction
//         await session.commitTransaction();
//         session.endSession();

//         // Return the payment and booking information
//         return {
//             payment: payment,
//             order: order,
//         };
//     } catch (error: any) {
//         // Abort the transaction in case of an error
//         await session.abortTransaction();
//         session.endSession();
//         throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, `Transaction failed: ${error}`);
//     }
// };


export const acceptOrderIntoDB = async (orderId: string, userId: string) => {
  const orderExists = await Order.findById(orderId);
  if (!orderExists) {
    throw new Error("Order not found");
  }
  if (orderExists.status !== "pending") {
    throw new Error("Order must has to be pending to be accepted")
  }
  const result = await Order.findByIdAndUpdate(orderId, { status: "processing" }, { new: true })
  return result;
}

export const getOrdersByUserFromDB = async (userId: string, role: string) => {
  try {
    let userOrders;
    if (role === 'user') {
      userOrders = await Order.find({ user: userId })
        .select("status total mechanic services")
        .populate({ path: 'mechanic', select: "name image email" })
        .populate({ path: 'services', model: 'Service', select: 'name' });

      let appService = await Commission.findOne({ applicable: 'user' }).select("amount");
      if (!appService) {
        throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
      }
      const serviceRates = await Promise.all(
        userOrders.map(async (order) => {
          const rating = await Mechanic.findOne({ user: order.mechanic }).select("rating");

          // Fetch the mechanic's service rates based on the mechanic in the order
          const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic })
            .populate({
              path: "services.service",
              model: "Service",
              select: "name"
            });

          if (!mechanicServiceRate) {
            return { ...order.toObject(), serviceRates: [] };
          }

          // Map the services in the order to get name and price
          const servicesWithRates = order.services.map(orderService => {
            // Find matching service rate from mechanic's rates
            const matchedServiceRate = mechanicServiceRate.services.find(serviceRate =>
              serviceRate.service._id.toString() === (orderService as any)._id.toString()
            );

            if (matchedServiceRate) {
              return {
                name: (orderService as any).name,    // Get name from order's populated service
                price: matchedServiceRate.price,     // Get price from service rate
                _id: matchedServiceRate._id
              };
            }

            // If no matching rate found, still return the service name with null price
            return {
              name: (orderService as any).name,
              price: null,
              _id: (orderService as any)._id
            };
          });

          // Combine the order data with the service rates
          return {
            ...order.toObject(),
            serviceRates: servicesWithRates,
            appService: appService.amount,
            rating: rating ? rating.rating : null
          };
        })
      );

      return serviceRates;
    } else if (role === 'mechanic') {
      userOrders = await Order.find({ mechanic: userId })
        .select("status total mechanic services")
        .populate({ path: 'mechanic', select: "name image email" })
        .populate({ path: 'services', model: 'Service', select: 'name' });

      let appService = await Commission.findOne({ applicable: 'user' }).select("amount");
      if (!appService) {
        throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
      }
      const serviceRates = await Promise.all(
        userOrders.map(async (order) => {
          const rating = await Mechanic.findOne({ user: order.mechanic }).select("rating");

          // Fetch the mechanic's service rates based on the mechanic in the order
          const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic })
            .populate({
              path: "services.service",
              model: "Service",
              select: "name"
            });

          if (!mechanicServiceRate) {
            return { ...order.toObject(), serviceRates: [] };
          }

          // Map the services in the order to get name and price
          const servicesWithRates = order.services.map(orderService => {
            // Find matching service rate from mechanic's rates
            const matchedServiceRate = mechanicServiceRate.services.find(serviceRate =>
              serviceRate.service._id.toString() === (orderService as any)._id.toString()
            );

            if (matchedServiceRate) {
              return {
                name: (orderService as any).name,    // Get name from order's populated service
                price: matchedServiceRate.price,     // Get price from service rate
                _id: matchedServiceRate._id
              };
            }

            // If no matching rate found, still return the service name with null price
            return {
              name: (orderService as any).name,
              price: null,
              _id: (orderService as any)._id
            };
          });

          // Combine the order data with the service rates
          return {
            ...order.toObject(),
            serviceRates: servicesWithRates,
            appService: appService.amount,
            rating: rating ? rating.rating : null
          };
        })
      );

      return serviceRates;
    } else if (role === "admin") {
      userOrders = await Order.find({})
        .populate({ path: 'mechanic', select: "name image email" })
        .populate({ path: 'services', model: 'Service', select: 'name' });

      let appService = await Commission.findOne({ applicable: 'user' }).select("amount");
      if (!appService) {
        throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
      }
      const serviceRates = await Promise.all(
        userOrders.map(async (order) => {
          const rating = await Mechanic.findOne({ user: order.mechanic }).select("rating");

          // Fetch the mechanic's service rates based on the mechanic in the order
          const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic })
            .populate({
              path: "services.service",
              model: "Service",
              select: "name"
            });

          if (!mechanicServiceRate) {
            return { ...order.toObject(), serviceRates: [] };
          }

          // Map the services in the order to get name and price
          const servicesWithRates = order.services.map(orderService => {
            // Find matching service rate from mechanic's rates
            const matchedServiceRate = mechanicServiceRate.services.find(serviceRate =>
              serviceRate.service._id.toString() === (orderService as any)._id.toString()
            );

            if (matchedServiceRate) {
              return {
                name: (orderService as any).name,    // Get name from order's populated service
                price: matchedServiceRate.price,     // Get price from service rate
                _id: matchedServiceRate._id
              };
            }

            // If no matching rate found, still return the service name with null price
            return {
              name: (orderService as any).name,
              price: null,
              _id: (orderService as any)._id
            };
          });

          // Combine the order data with the service rates
          return {
            ...order.toObject(),
            serviceRates: servicesWithRates,
            appService: appService.amount,
            rating: rating ? rating.rating : null
          };
        })
      );

      return serviceRates;
    }


    // Fetch service rates for each order

  } catch (error) {
    console.error("Error fetching orders or service rates:", error);
    throw new Error("An error occurred while fetching the order data.");
  }
};

// export const getOrdersByUserFromDB = async (userId: string) => {
//   try {
//     // Fetch all orders for the user and populate required fields
//     const userOrders = await Order.find({ user: userId })
//       .select("status total mechanic services")
//       .populate({ path: 'mechanic', select: "name image email" })
//       .populate({ path: 'services', model: 'Service', select: 'name' });
//     // .populate('vehicle')
//     // .populate({ path: 'user', select: "name image email phone" })
//     // .populate({
//     //   path: 'services',
//     //   model: 'Service', // Explicitly specify model if needed
//     //   select: 'name' // Select fields you want
//     // });

//     let appService = await Commission.findOne({ applicable: 'user' }).select("amount");
//     if (!appService) {
//       throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
//     }
//     // Fetch service rates for each order
//     const serviceRates = await Promise.all(
//       userOrders.map(async (order) => {
//         const rating = await Mechanic.findOne({ user: order.mechanic }).select("rating");
//         // Fetch the mechanic's service rates based on the mechanic in the order
//         const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic }).populate({path:"services.service",model:"Service", select:"name"});
//         // .populate({path:"services.service",model:"Service",select:"name"});
//         console.log(mechanicServiceRate)
//         if (!mechanicServiceRate) {
//           return { ...order.toObject(), serviceRates: [] }; // If no service rate found, return order with an empty array
//         }

//         // Map the services in the order to their respective rates
//         // const servicesWithRates = order.services.map(service => {
//         //   const matchedServiceRate = mechanicServiceRate.services.find(serviceRate =>
//         //     serviceRate.service.toString() === service.toString()
//         //   );

//         //   // If a matching service rate is found, include the price in the result
//         //   if (matchedServiceRate) {
//         //     return {
//         //       serviceId: service,
//         //       price: matchedServiceRate.price,
//         //     };
//         //   }

//         //   return {
//         //     serviceId: service,
//         //     price: null, // If no price is found, return null
//         //   };
//         // });
//         const filteredServices = mechanicServiceRate.services.filter(serviceRate => {
//           return order.services.some(orderService => {
//             return (orderService as any)._id.toString() === serviceRate.service.toString();
//           });
//         });
//                     // console.log(order)

//         // Combine the order data with the service rates
//         return { ...order.toObject(), serviceRates: filteredServices, appService: appService.amount, rating: rating ? rating.rating : null };
//       })
//     );

//     return serviceRates;
//   } catch (error) {
//     console.error("Error fetching orders or service rates:", error);
//     throw new Error("An error occurred while fetching the order data.");
//   }
// };




// export const getOrdersByUserFromDB = async (userId: string) => {
//   const userOrders = await Order.find({ user: userId }).populate({ path: 'mechanic', select: "name image email" })
//     .populate('vehicle').populate({ path: 'user', select: "name image email phone" })
//     .populate({
//       path: 'services',
//       model: 'Service', // Explicitly specify model if needed
//       select: 'name' // Select fields you want
//     });
//  const serviceRates = await Promise.all(
//     userOrders.map(async (order) => {
//       const serviceRateOfMechanic = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic });
//         return {...order.toObject(),serviceRateOfMechanic};
//     })
//   )

//   return serviceRates;

// }

export const getOrdersFromDB = async ({
  currentPage,
  limit,
}: {
  currentPage: number;
  limit: number;
}) => {
  const totalData = await Order.countDocuments();

  // Use paginationBuilder to get pagination details
  const paginationInfo = paginationBuilder({
    totalData,
    currentPage,
    limit,
  });
  const orders = await Order.find({}).skip((currentPage - 1) * limit)
    .limit(limit)
    .populate({ path: 'mechanic', select: "name image email" })
    .populate('vehicle').populate({ path: 'user', select: "name image email phone" })
    .populate({
      path: 'services',
      model: 'Service', // Explicitly specify model if needed
      select: 'name' // Select fields you want
    });
  return { paginationInfo, data: orders };
}
// export const getSingleOrderFromDB = async (orderId: string, userData: Partial<IUser>) => {
//   let appService = await Commission.findOne({ applicable: 'user' }).select("amount");
//   if (!appService) {
//     throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
//   }
//   if (userData.role === 'user') {
//     const result = await Order.findOne({ user: userData.id }).populate({ path: 'mechanic', select: "name image email" }).populate('vehicle').populate({ path: 'user', select: "name image email phone" })
//       .populate({
//         path: 'services',
//         model: 'Service', // Explicitly specify model if needed
//         select: 'name' // Select fields you want
//       });

//     return { result, appService: appService.amount };
//   }

//   const result = await Order.findById(orderId)
//   // .populate({ path: 'mechanic', select: "name image email" })
//   // .populate('vehicle').populate({ path: 'user', select: "name image email phone" });
//   const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: result?.mechanic })
//   console.log(result), "mecha.....................",mechanicServiceRate;

//   return { result, appService: appService.amount, mechanicServiceRate };

// }

// Full service to fetch the mechanic's service rates
export const getSingleOrderFromDB = async (orderId: string, userData: Partial<IUser>) => {
  try {
    let appService = await Commission.findOne({ applicable: 'user' }).select("amount");
    if (!appService) {
      throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
    }

    // if (userData.role === 'user') {
    //   // When the user role is 'user', fetch order data for that user
    //   const result = await Order.findOne({ user: userData.id })
    //     .populate({ path: 'mechanic', select: "name image email" })
    //     .populate('vehicle')
    //     .populate({ path: 'user', select: "name image email phone" })
    //     .populate({
    //       path: 'services',
    //       model: 'Service',
    //       select: 'name',
    //     });

    //   return { result, appService: appService.amount };
    // }

    // Fetching the order for a specific orderId for other roles
    const result = await Order.findById(orderId)
      .populate({ path: 'mechanic', select: "name image email" })
      .populate('vehicle')
      .populate({ path: 'user', select: "name image email phone" });

    if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Order not found");
    }

    // Fetch mechanic's service rate
    const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: result.mechanic })
      .populate('services.service', 'name') // Populating service field with name
      .lean(); // Convert to plain object for easier manipulation

    if (!mechanicServiceRate) {
      throw new AppError(httpStatus.NOT_FOUND, "Mechanic service rates not found");
    }

    // Filter services to only include those that match the order's services
    const filteredServices = mechanicServiceRate.services.filter(serviceRate => {
      return result.services.some(orderServiceId =>
        orderServiceId.toString() === serviceRate.service._id.toString()
      );
    });

    // Create the filtered mechanicServiceRate object
    const filteredMechanicServiceRate = {
      _id: mechanicServiceRate._id,
      mechanic: mechanicServiceRate.mechanic,
      services: filteredServices,
    };

    // console.log("Filtered Mechanic Service Rates:", filteredMechanicServiceRate);

    // Return the order, app service amount, and filtered mechanic's service rates
    return {
      result,
      appService: appService.amount,
      mechanicServiceRate: filteredMechanicServiceRate
    };
  } catch (error) {
    console.error("Error fetching order data:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "An error occurred while fetching the order data");
  }
};

export const getOrdersByStatusFromDB = async (status: string, userData: Partial<IUser>) => {
  const userId = userData?.id;  // The logged-in user's ID
  let cancelledCount, processingCount, completedCount;
  const query = status ? { status } : {};

  // If the user is an admin, they can fetch orders for any mechanic
  if (userData.role === 'admin') {
    const order = await Order.find(query).select("-vehicle -services -location -user");
    processingCount = await Order.countDocuments({ status: 'processing' });
    completedCount = await Order.countDocuments({ status: 'completed' });
    cancelledCount = await Order.countDocuments({ status: 'cancelled' });
    return { order, processingCount, completedCount, cancelledCount };
  }

  // If the user is a mechanic, they can only fetch their own orders
  if (userData.role === 'mechanic') {
    // Get mechanic's location from the database
    const mechanic = await UserModel.findById(userId).select('location');

    if (!mechanic || !mechanic.location) {
      return { error: "Mechanic location not found" };
    }

    const mechanicLocation = mechanic.location.coordinates;

    const orders = await Order.find({ ...query, mechanic: userId })
      .select("vehicle services location user total status")
      .populate({ path: 'vehicle', select: "brand model number" })
      .populate({ path: 'user', select: "name" })
      .populate({ path: "services", model: "Service", select: "name" });

    // Add the distance property for each order
    const ordersWithDistance = await Promise.all(
      orders.map(async (order) => {
        const userLocation = order.location.coordinates;

        // Calculate distance between mechanic and user location using MongoDB's geoNear or Haversine formula
        const distance = calculateDistance(mechanicLocation, userLocation);  // Implement this function to calculate the distance

        return {
          ...order.toObject(),
          distance: Number(distance).toFixed(2), // Fixed to two decimal places
        };
      })
    );

    processingCount = await Order.countDocuments({ status: 'processing' });
    completedCount = await Order.countDocuments({ status: 'completed' });
    cancelledCount = await Order.countDocuments({ status: 'cancelled' });

    return { orders: ordersWithDistance, processingCount, completedCount, cancelledCount };
  }
};

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
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const fiveDigitOTPToConfirmOrder = Math.floor(10000 + Math.random() * 90000).toString();
  await NotificationModel.create({
    userId: order.user,
    userMsg: `Please enter this code ${fiveDigitOTPToConfirmOrder} to complete the order ${orderId}`,
    adminMsg: ""
  });

  const mechanicWallet = await Wallet.findOne({ user: order.mechanic });
  if (!mechanicWallet) {
    await Wallet.create({ user: order.mechanic });
  }

  // emitNotification({
  //     userId: order.user,
  //     userMsg: `Please enter this code ${fiveDigitOTPToConfirmOrder} to complete the order`,
  //     adminMsg: ""
  // })
  // Update the wallet with the calculated earning
  // const updatedWallet = await Wallet.findOneAndUpdate(
  //     { user: mechanicId },
  //     {
  //         $inc: {
  //             totalEarnings: earning,
  //             availableBalance: earning
  //         }
  //     },
  //     { new: true }
  // );

  // // Check if the wallet was updated successfully
  // if (!updatedWallet) {
  //     throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update wallet");
  // }

  // Return the updated wallet
  return fiveDigitOTPToConfirmOrder;
};

export const verifyOrderCompletionFromUserEndIntoDB = async (
  orderId: string,
  userId: string,
  code: string
) => {

  // Find the order by ID and verify ownership if necessary
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order does not exist or does not belong to this user');
  }

  if (order.status === 'completed') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Order is already completed');
  }

  // Verify that the notification with the expected verification code exists for this user
  const expectedMsg = `Please enter this code ${code} to complete the order ${orderId}`;

  const orderVerificationCodeMatch = await NotificationModel.findOne({ userId, userMsg: expectedMsg });

  if (!orderVerificationCodeMatch) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your verification code does not match');
  }

  // Ensure mechanic wallet exists or create it
  let mechanicWallet = await Wallet.findOne({ user: order.mechanic });
  if (!mechanicWallet) {
    mechanicWallet = await Wallet.create({ user: order.mechanic, totalBalance: 0, totalWithdrawal: 0, type: 'mechanic' });
  }

  // Find mechanic commission config
  const mechanicCommission = await Commission.findOne({ applicable: 'mechanic' });
  if (!mechanicCommission) {
    throw new AppError(httpStatus.NOT_FOUND, 'Commission configuration for mechanic not found');
  }

  // Find user commission config (optional)
  const userCommission = await Commission.findOne({ applicable: 'user' });

  const orderTotal = order.total ?? 0;
  let mechanicEarning = 0;
  let profitTotal = 0;

  // Calculate mechanic earnings and profit based on commission types
  if (mechanicCommission.type === 'number') {
    mechanicEarning = orderTotal - mechanicCommission.amount;
  } else if (mechanicCommission.type === 'percentage') {
    mechanicEarning = orderTotal - (orderTotal * mechanicCommission.amount) / 100;
  }

  // Calculate total profit for admin
  if (userCommission) {
    if (userCommission.type === 'number') {
      profitTotal = (orderTotal - mechanicEarning) + userCommission.amount;
    } else if (userCommission.type === 'percentage') {
      profitTotal = (orderTotal - mechanicEarning) + (orderTotal * userCommission.amount) / 100;
    } else {
      profitTotal = orderTotal - mechanicEarning;
    }
  } else {
    profitTotal = orderTotal - mechanicEarning;
  }

  // Update admin earnings and profit
  await Admin.findOneAndUpdate(
    { role: 'admin' },
    {
      $inc: {
        totalEarnings: orderTotal,
        profit: profitTotal,
      },
    }
  );

  // Update mechanic wallet balance
  //   mechanicWallet.totalBalance += mechanicEarning;
  //   await mechanicWallet.save();

  // Mark order as completed
  order.status = 'completed';
  await order.save();

  // Optionally, you can return updated order and wallet info
  return {
    order,
    mechanicWallet,
    notification: orderVerificationCodeMatch,
  };
};

export const cancelOrderFromDB = async (orderId: string, userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const order = await Order.findOne({ _id: orderId, mechanic: userId });
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found or does not belong to this user");
  }
  if (order.status === "completed") {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot cancel a completed order");
  }
  if (order.status === "cancelled") {
    throw new AppError(httpStatus.BAD_REQUEST, "Order is already cancelled");
  }
  order.status = "cancelled";
  await order.save();
  return order;
}
export const getOrderByIdFromDB = async (orderId: string,) => {
  const order = await Order.findById(orderId)
    .populate({ path: 'mechanic', select: "name image email" })
    .populate('vehicle')
    .populate({ path: 'user', select: "name image email phone" })
    .populate({ path: 'services', model: 'Service', select: 'name' });

  return order;
}

// export const verifyOrderCompletionFromUserEndIntoDB = async (orderId: string, userId: string, code: string) => {
//     const order = await Order.findOne({ _id: orderId });

//     // Check if order exists
//     if (!order) {
//         throw new AppError(httpStatus.NOT_FOUND, "Order does not exist or does not belong to this mechanic");
//     }

//     if (order.status === "completed") {
//         throw new AppError(httpStatus.BAD_REQUEST, "Order is already completed");
//     }
//     const orderVerificationCodeMatch = await NotificationModel.findOne({ userMsg: `Please enter this code ${code} to complete the order ${orderId}` })
//     if (!orderVerificationCodeMatch) {
//         throw new Error("Your verification code does not match")
//     }

//     const mechanicWallet = await Wallet.findOne({ user: order.mechanic });
//     if (!mechanicWallet) {
//         await Wallet.create({ user: order.mechanic });
//     }

//     // Find the commission
//     const commission = await Commission.findOne({ applicable: "mechanic" });

//     // Ensure commission exists
//     if (!commission) {
//         throw new AppError(httpStatus.NOT_FOUND, "Commission configuration not found");
//     }
//     let earning, commissionUser, profitTotal;
//     const orderTotal = order?.total;
//     if (commission.type === "number") {
//         // Calculate earnings
//         earning = (order?.total ?? 0) - (commission?.amount ?? 0);
//         commissionUser = await Commission.findOne({ applicable: "user" });
//         if (commissionUser?.type === "number") {
//             profitTotal = (commission.amount ?? 0) + (commissionUser?.amount ?? 0);
//             await Admin.findOneAndUpdate({ role: "admin" }, {
//                 $inc: {
//                     totalEarnings: orderTotal,
//                     profit: profitTotal
//                 }
//             })
//         } else if (commissionUser?.type === "percentage") {
//             const userProfit = (order.total * (commissionUser?.amount ?? 0)) / 100
//             profitTotal = (commission.amount ?? 0) + userProfit;
//             await Admin.findOneAndUpdate({ role: "admin" }, {
//                 $inc: {
//                     totalEarnings: orderTotal,
//                     profit: profitTotal
//                 }
//             })
//         }

//     } else if (commission.type === "percentage") {
//         const commissionPercentageToNumber = ((commission?.amount ?? 0) / 100) * order?.total;
//         earning = (order?.total ?? 0) - commissionPercentageToNumber;
//         commissionUser = await Commission.findOne({ applicable: "user" });
//         if (commissionUser?.type === "number") {
//             profitTotal = commissionPercentageToNumber + (commissionUser?.amount ?? 0);
//             await Admin.findOneAndUpdate({ role: "admin" }, {
//                 $inc: {
//                     totalEarnings: orderTotal,
//                     profit: profitTotal
//                 }
//             })
//         } else if (commissionUser?.type === "percentage") {
//             const commissionPercentageToNumber = ((commission?.amount ?? 0) / 100) * orderTotal;
//             const userCommissionPercentageToNumber = (commissionUser?.amount / 100) * orderTotal
//             profitTotal = commissionPercentageToNumber + userCommissionPercentageToNumber;
//             await Admin.findOneAndUpdate({ role: "admin" }, {
//                 $inc: {
//                     totalEarnings: orderTotal,
//                     profit: profitTotal
//                 }
//             })
//         }

//     }
//     order.status = "completed";
//     await order.save();
//     return orderVerificationCodeMatch;
// }
