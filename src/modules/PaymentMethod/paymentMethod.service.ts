import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { UserModel } from "../user/user.model";
import PaymentMethod, { IPaymentMethod } from "./paymentMethod.model"

export const createPaymentMethodIntoDB = async (userId: string, paymentMethodData: IPaymentMethod) => {
    const {bankName, accountHolderName, accountNumber} = paymentMethodData;
    const paymentMethodExists = await PaymentMethod.findOne({ user: userId });
    if (paymentMethodExists) {
        throw new AppError(httpStatus.BAD_REQUEST, "Payment method already exists for this user");
    }
    const result = await PaymentMethod.create({user: userId,bankName, accountHolderName, accountNumber })
    return result;
}
export const getAllPaymentMethodsFromDB = async (userId : string) => {
    const user = await UserModel.findById(userId);
    if(!user){
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    const result = await PaymentMethod.find({user:userId});
    return result;
}
export const deletePaymentMethodFromDB = async (userId : string,paymentMethodId:string ) => {
    const user = await UserModel.findById(userId);
    if(!user){
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    const result = await PaymentMethod.findOneAndDelete({user: userId, _id: paymentMethodId});
    return result;
}