import Order from "../Order/order.model";
import { UserModel } from "../user/user.model";
import { IReview } from "./review.interface";
import Review from "./review.model"
  
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
      mechanic: order.mechanic,
      rating,
      comment,
    });
  
    return review;
  };

export const getReviewsFromDB = async(mechanicId: string)=>{
    if (!mechanicId) {
        throw new Error('Mechanic ID is required');
    }
    const isMechanic = await UserModel.findById(mechanicId);
    if(isMechanic?.role !== 'mechanic') {
        throw new Error('User is not a mechanic');
    }
    // Fetch reviews for the mechanic
    const reviews = await Review.find({ mechanic: mechanicId }).populate('user', 'name image');
    if (!reviews || reviews.length === 0) {
      throw new Error('No reviews found for this mechanic');
    }

    // Calculate average rating
    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    return { reviews, averageRating };
}
export const getReviewByMechanicFromDB = async (mechanicId: string) => {
   

    // return reviews;
};