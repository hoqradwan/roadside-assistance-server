import Mechanic from "../Mechanic/mechanic.model";
import { MechanicServiceRateModel } from "../MechanicServiceRate/mechanicServiceRate.model";
import Order from "../Order/order.model";
import PaymentMethod from "../PaymentMethod/paymentMethod.model";
import { UserModel } from "../user/user.model";
import Wallet from "../Wallet/wallet.model";
import Withdraw from "./withdraw.model";

export const createWithdrawIntoDB = async (amount: number, id: string) => {
    const mechanicWallet = await Wallet.findOne({ user: id });
    if (!mechanicWallet) {
        throw new Error('No money in this mechanic account');
    }
    if (mechanicWallet.availableBalance < amount) {
        throw new Error('Not enough money to withdraw');
    }
    const withdraw = new Withdraw({
        amount,
        user: id
    });
    await withdraw.save();
    return withdraw;
}
export const markAsPaidIntoDB = async (mechanicId: string) => {
    const result = await Withdraw.findByIdAndUpdate(mechanicId, { status: 'completed' }, { new: true });
    return result;
}
export const getAllWithdrawRequestsFromDB = async () => {
    const mechanicWithdraw = await Withdraw.find().lean();
    const mechanicWithdrawWithServiceCount = await Promise.all(
        mechanicWithdraw.map(async (withdraw) => {
            const mechanic = await Mechanic.findOne({ user: withdraw.user }).populate({ path: "user", select: "name" }).select("uniqueMechanicId").lean();
            const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: withdraw.user });
            const mechanicPaymentInfo = await PaymentMethod.findOne({ user: withdraw.user })
            const serviceCount = mechanicServiceRate?.services.length;
            return {
                ...withdraw,
                mechanic,
                mechanicPaymentInfo,
                serviceCount
            };
        })
    );
    return mechanicWithdrawWithServiceCount;
};

export const getAllWithdrawRequestsByMechanic = async (mechanicId: string) => {
    const mechanic = await UserModel.findById(mechanicId);
    if (!mechanic) {
        throw new Error("Mechanic not found");
    }

    // Get all orders for this mechanic
    const mechanicOrders = await Order.find({ mechanic: mechanicId });
    if (!mechanicOrders || mechanicOrders.length === 0) {
        throw new Error("No orders found for this mechanic");
    }

    interface ServiceEntry {
        _id: any;
        status: string;
        amount: number;
        user: any;
        createdAt: Date;
        updatedAt: Date;
        __v: number;
        name: string;
    }
    
    const serviceEntries: ServiceEntry[] = [];

    for (const order of mechanicOrders) {
        // Use lean() for better performance and cleaner objects
        const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic })
            .populate("services.service")
        if (mechanicServiceRate) {
            // console.log("Found mechanic service rate with", mechanicServiceRate.services?.length, "services");
            // Debug each service
            // mechanicServiceRate.services?.forEach((serviceRate: any, index: number) => {
            //     console.log(`Service ${index}:`, {
            //         serviceId: serviceRate.service._id,
            //         serviceName: serviceRate.service.name,
            //         price: serviceRate.price
            //     });
            // });


            // Map each service in the order to create individual entries
            order.services.forEach(orderServiceId => {
                const matchedServiceRate = mechanicServiceRate.services?.find((serviceRate: any) =>
                    serviceRate.service._id.toString() === orderServiceId.toString()
                );
                console.log(matchedServiceRate, orderServiceId)
                if (matchedServiceRate) {
                    console.log("Matched service:", {
                        orderId: order._id,
                        serviceName: (matchedServiceRate.service as any).name,
                        price: matchedServiceRate.price
                    });

                    serviceEntries.push({
                        _id: order._id,
                        status: order.status,
                        amount: matchedServiceRate.price,
                        user: order.user,
                        createdAt: order.get("createdAt"),
                        updatedAt: order.get("updatedAt"),
                        __v: order.__v,
                        name: (matchedServiceRate.service as any).name
                    });
                } else {
                    console.log("No matching service rate found for:", orderServiceId);
                }
            });
        } else {
            console.log("No mechanic service rate found for mechanic:", order.mechanic);
        }
    }

    // Rest of your code remains the same...
    const withdrawRequests = await Withdraw.find({ user: mechanicId });
    
    const withdrawEntries = withdrawRequests.map((withdraw) => ({
        _id: withdraw._id,
        status: withdraw.status,
        amount: withdraw.amount,
        user: withdraw.user,
        createdAt: withdraw.get("createdAt"),
        updatedAt: withdraw.get("updatedAt"),
        __v: withdraw.__v,
        name: "from admin"
    }));

    const combinedData = [...serviceEntries, ...withdrawEntries];
    combinedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combinedData;
};
// export const getAllWithdrawRequestsByMechanic = async (mechanicId: string) => {
//     const mechanic = await UserModel.findById(mechanicId);
//     if (!mechanic) {
//         throw new Error("Mechanic not found");
//     }
//     const mechanicOrders = await Order.find({ mechanic: mechanicId });
//     if (!mechanicOrders) {
//         throw new Error("No orders found for this mechanic");
//     }


//     const withdrawRequests = await Withdraw.find({ user: mechanicId });
//     const withdrawRequestsWIthName = withdrawRequests.map((withdraw) => {
//         return {
//             ...withdraw.toObject(),
//             name: "Transaction Amount",
//         }
//     })
//     return withdrawRequestsWIthName;
// }

// export const getAllWithdrawRequestsByMechanic = async (mechanicId: string) => {
//     const mechanic = await UserModel.findById(mechanicId);
//     if (!mechanic) {
//         throw new Error("Mechanic not found");
//     }

//     // Get all orders for this mechanic
//     const mechanicOrders = await Order.find({ mechanic: mechanicId });
//     if (!mechanicOrders || mechanicOrders.length === 0) {
//         throw new Error("No orders found for this mechanic");
//     }

//     // Process orders to get service-based entries
//     interface ServiceEntry {
//         _id: any;
//         status: string;
//         amount: number;
//         user: any;
//         createdAt: Date;
//         updatedAt: Date;
//         __v: number;
//         name: string;
//     }

//     interface WithdrawEntry {
//         _id: any;
//         status: string;
//         amount: number;
//         user: any;
//         createdAt: Date;
//         updatedAt: Date;
//         __v: number;
//         name: string;
//     }

//     const serviceEntries: ServiceEntry[] = [];

//     for (const order of mechanicOrders) {
//         // Fetch the mechanic's service rates
//         const mechanicServiceRate = await MechanicServiceRateModel.findOne({ mechanic: order.mechanic })
//             .populate({
//                 path: "services.service",
//                 select: "_id name"
//             });
//             console.log(mechanicServiceRate)
//         if (mechanicServiceRate) {
//             // Map each service in the order to create individual entries
//             order.services.forEach(orderServiceId => {
//                 // Find matching service rate from mechanic's rates
//                 const matchedServiceRate = mechanicServiceRate.services.find(serviceRate =>(
//                 serviceRate.service._id.toString() === orderServiceId.toString()
//                 ));

//             if (matchedServiceRate) {
//                 serviceEntries.push({
//                     _id: order._id,
//                     status: order.status, // "processing", "pending", "completed", etc.
//                     amount: matchedServiceRate.price,
//                     user: order.user,
//                     createdAt: order.get('createdAt'),
//                     updatedAt: order.get('updatedAt'),
//                     __v: order.__v,
//                     name: (matchedServiceRate.service as any).name // service name
//                 });
//             }
//         });
//     }
// }
// // Get all withdraw requests for this mechanic
// const withdrawRequests = await Withdraw.find({ user: mechanicId });

// // Process withdraw requests
// const withdrawEntries = withdrawRequests.map((withdraw) => ({
//     _id: withdraw._id,
//     status: withdraw.status, // "withdraw" or whatever exists in database
//     amount: withdraw.amount,
//     user: withdraw.user,
//     createdAt: withdraw.get("createdAt"),
//     updatedAt: withdraw.get("updatedAt"),
//     name: "from admin" // static text
// }));

// // Combine both arrays
// const combinedData = [...serviceEntries, ...withdrawEntries];

// // Sort by createdAt (newest first) - optional
// combinedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// return combinedData;
// }