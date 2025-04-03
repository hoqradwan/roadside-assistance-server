import { Types } from "mongoose";

export interface IReview extends Document {
    user: Types.ObjectId;
    order: Types.ObjectId;
    service: Types.ObjectId;
    mechanic: Types.ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
}