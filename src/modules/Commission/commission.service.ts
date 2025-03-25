import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { ICommission } from "./commission.interface";
import { Commission } from "./commission.model";

export const getCommissionsFromDB = async () => {
    return await Commission.find();
}   
export const createCommissionIntoDB = async (commissionData : ICommission) => {
    const commission = await Commission.findOne({applicable: commissionData.applicable});
    if(commission) {
        throw new AppError(httpStatus.BAD_REQUEST,"Commission already exists for this applicable");
    }
    const newCommission = await Commission.create(commissionData);
    return newCommission;
}   
export const updateCommissionIntoDB = async (commissionData : Partial<ICommission>,commissionId : string) => {
    const commission = await Commission.findById(commissionId);
    if (!commission) {
        throw new AppError(httpStatus.NOT_FOUND, "Commission not found");
    }
    if(commissionData.applicable){
        throw new AppError(httpStatus.BAD_REQUEST, "Applicable cannot be updated");
    }
    Object.assign(commission, commissionData);
    await commission.save();
    return commission;
}   
export const deleteCommissionIntoDB = async (commissionId: string) => {
    const result = await Commission.deleteOne({ _id: commissionId });
  
    if (result.deletedCount === 0) {
      throw new AppError(httpStatus.NOT_FOUND, "Commission not found");
    }
  
    return null;
  };
  