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
        user: id,
        adminStatus: 'pending' // Default status for admin review
    });
    await withdraw.save();
    return withdraw;
}
export const markAsPaidIntoDB = async (mechanicId: string) => {
    const result = await Withdraw.findByIdAndUpdate(mechanicId, {
        status: 'withdraw',
        adminStatus: 'completed'
    }, { new: true });
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
    const withdrawRequests = await Withdraw.find({ user: mechanicId, status: 'withdraw' });

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
export const getAllWithdrawRequestsForAdminFromDB = async () => {
    const withdrawRequests = await Withdraw.find().select("-status").populate({ path: "user", select: "name image uniqueUserId experience role" });
    const paymentMethods = await PaymentMethod.find();

    // Create a map for fast lookup of payment methods by user ID
    const paymentMethodsMap = new Map(paymentMethods.map(pm => [pm.user.toString(), pm]));

    const withdrawRequestsWithPaymentMethods = withdrawRequests.map((withdraw) => {
        // Use map to find the payment method efficiently
        const paymentMethod = paymentMethodsMap.get((withdraw.user as any)._id.toString()) || null;

        return {
            ...withdraw.toObject(),
            paymentMethod
        };
    });

    return withdrawRequestsWithPaymentMethods;
};


// export const getAllWithdrawRequestsForAdminFromDB = async () => {
//     const withdrawRequests = await Withdraw.find().select("-status").populate({ path: "user", select: "name image uniqueUserId experience role" });
//     const paymentMethods = await PaymentMethod.find();

//     const withdrawRequestsWithPaymentMethods: any[] = [];

//     // Use for loop to iterate over withdrawRequests
//     for (let i = 0; i < withdrawRequests.length; i++) {
//         const withdraw = withdrawRequests[i];
        
//         // Find the corresponding payment method by iterating through the paymentMethods array
//         const paymentMethod = paymentMethods.find(pm => pm.user.toString() === (withdraw.user as any)._id.toString()) || null;

//         // Push the result into the new array
//         withdrawRequestsWithPaymentMethods.push({
//             ...withdraw.toObject(),
//             paymentMethod
//         });
//     }

//     return withdrawRequestsWithPaymentMethods;
// };
