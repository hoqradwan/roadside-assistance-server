import { Router } from 'express';
import { createReview,getReviews, getReviewByMechanic} from './review.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

// Create a new review
router.post('/', adminMiddleware("user"), createReview);

// // Get all reviews
router.get('/:mechanicId',adminMiddleware("user"), getReviews);

// // Get a review by ID
router.get('/mechanic',adminMiddleware("mechanic"), getReviewByMechanic);

// // Update a review by ID
// router.put('/:id', updateReview);

// // Delete a review by ID
// router.delete('/:id', deleteReview);

export const reviewRoutes =  router;