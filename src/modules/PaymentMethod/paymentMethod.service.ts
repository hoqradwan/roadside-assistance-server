import PaymentMethod, { IPaymentMethod } from "./paymentMethod.model"

export const createPaymentMethodIntoDB = async(paymentMethodData : IPaymentMethod)=>{
    const result = await PaymentMethod.create(paymentMethodData)
    return result;
}
export const getAllPaymentMethodsFromDB = async()=>{
    const result = await PaymentMethod.find({})
    return result;
}