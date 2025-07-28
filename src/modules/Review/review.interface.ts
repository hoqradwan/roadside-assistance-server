import { Types } from "mongoose";

export interface IReview extends Document {
    user: Types.ObjectId;
    mechanic: Types.ObjectId;
    order: Types.ObjectId;
    service: Types.ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
}