import { Schema, model, Document, Types } from 'mongoose';
import { IReview } from './review.interface';

const ReviewSchema = new Schema<IReview>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
        mechanic: {type : Schema.Types.ObjectId, ref: 'Mechanic', required: true},
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: false },
    },
    {
        timestamps: true,
    }
);

const Review = model<IReview>('Review', ReviewSchema);

export default Review;