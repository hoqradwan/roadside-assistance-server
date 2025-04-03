import Order from "../Order/order.model";
import { IReview } from "./review.interface";
import Review from "./review.model"

// export const createReviewIntoDB = async (reviewData: IReview, userId: string) => {
//     const { user: _, ...restOfReviewData } = reviewData; 
//     const review = await Review.create({ user: userId, ...restOfReviewData });
//     return review;
//   };
  
export const createReviewIntoDB = async (reviewData: IReview, userId: string) => {
    const { order: orderId, rating, comment } = reviewData;
  
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
  
    // Ensure the user who placed the order is leaving the review
    if (order.user.toString() !== userId) {
      throw new Error('Unauthorized to review this order');
    }
  
    // Prevent multiple reviews for same order
    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      throw new Error('Review already exists for this order');
    }
  
    // Create review
    const review = await Review.create({
      user: userId,
      order: orderId,
      service: order.service,
      mechanic: order.mechanic,
      rating,
      comment,
    });
  
    return review;
  };

export const getReviewsFromDB = async()=>{
    const reviews = await Review.find();
    return reviews;
}
export const getReviewByMechanicFromDB = async(mechanicId: string)=>{
    const reviews = await Review.find({mechanic : mechanicId});
    return reviews;
}