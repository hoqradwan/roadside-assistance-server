import { UserModel } from "../user/user.model";
import { trackingEventEmitter } from "./locationTracking.event";
import { IDistanceTracking } from "./locationTracking.interface";
import { DistanceTrackingModel } from "./locationTracking.model";
import { calculateDistance, calculateETA } from "./locationTracking.utils";

export const initializeTrackingIntoDB = async (
  serviceRequestId: string, 
  userId: string, 
  mechanicId: string
): Promise<IDistanceTracking> => {
  // Get user and mechanic locations
  const user = await UserModel.findById(userId);
  const mechanic = await UserModel.findById(mechanicId);

  if (!user || !mechanic) {
    throw new Error('User or mechanic not found');
  }

  const distance = calculateDistance(
    user.location.coordinates[1], // latitude
    user.location.coordinates[0], // longitude
    mechanic.location.coordinates[1],
    mechanic.location.coordinates[0]
  );

  const estimatedArrival = calculateETA(distance);

  const tracking = new DistanceTrackingModel({
    serviceRequestId,
    userId,
    mechanicId,
    userLocation: user.location,
    mechanicLocation: mechanic.location,
    distance,
    estimatedArrival,
    status: 'pending'
  });

  await tracking.save();
  
  // Emit tracking initialized event
  trackingEventEmitter.emit('trackingInitialized', {
    serviceRequestId,
    userId,
    mechanicId,
    distance,
    estimatedArrival
  });

  return tracking;
};