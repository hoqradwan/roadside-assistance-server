import { Router } from 'express';
import { adminMiddleware } from '../../middlewares/auth';
import { cancelTracking, completeTracking, initializeTracking, updateMechanicLocation, updateUserLocation } from './locationTracking.controller';
import { getTrackingHistory, getTrackingInfo } from './locationTracking.service';

const router = Router();

// Initialize tracking
router.post('/initialize', adminMiddleware("user"), initializeTracking);

// Update locations
router.put('/:orderId/mechanic-location', adminMiddleware("user"), updateMechanicLocation);
router.put('/:orderId/user-location',adminMiddleware("user"),  updateUserLocation);

// Get tracking info
router.get('/:serviceRequestId', getTrackingInfo);
router.get('/:serviceRequestId/history', getTrackingHistory);

// // Complete/Cancel tracking
router.put('/:serviceRequestId/complete', completeTracking);
router.put('/:serviceRequestId/cancel', cancelTracking);

// // Find nearby mechanics
// router.get('/mechanics/nearby', trackingController.findNearbyMechanicsController);

export const locationTrackingRoutes = router;