import { UserModel } from "../user/user.model";
import { trackingEventEmitter } from "./locationTracking.event";
import { IDistanceTracking, ILocationUpdate } from "./locationTracking.interface";
import { DistanceTrackingModel } from "./locationTracking.model";
import { calculateDistance, calculateETA } from "./locationTracking.utils";

export const initializeTrackingIntoDB = async (
  orderId: string, 
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
    orderId: orderId,
    userId,
    mechanicId,
    userLocation: user.location,
    mechanicLocation: mechanic.location,
    distance,
    estimatedArrival,
    status: 'pending'
  });

  await tracking.save();
//   trackingEventEmitter.on('trackingInitialized', (data) => {
//   console.log('Event data received:', data);

//   // Example: Process the event (save data, notify, etc.)
//   // Here, we're just simulating an action
//   setTimeout(() => {
//     console.log(`Processed tracking event for Order ID: ${data.orderId}`);
//   }, 1000);
// });

  // Emit tracking initialized event
  trackingEventEmitter.emit('trackingInitialized', {
    orderId: orderId,
    userId,
    mechanicId,
    distance,
    estimatedArrival
  });

  return tracking;
};

export const updateMechanicLocationIntoDB = async (
  orderId: string, 
  mechanicId: string, 
  longitude: number, 
  latitude: number,
  additionalData?: { accuracy?: number; speed?: number; heading?: number }
): Promise<IDistanceTracking | null> => {
  const tracking = await DistanceTrackingModel.findOne({ 
    orderId, 
    mechanicId,
    status: { $in: ['pending', 'in_progress'] }
  });

  if (!tracking) {
    throw new Error('Active tracking session not found');
  }

  // Update mechanic location
  tracking.mechanicLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  // Calculate new distance
  const newDistance = calculateDistance(
    tracking.userLocation.coordinates[1], // user latitude
    tracking.userLocation.coordinates[0], // user longitude
    latitude, // mechanic latitude
    longitude  // mechanic longitude
  );

  tracking.distance = newDistance;
  tracking.estimatedArrival = calculateETA(newDistance);
  tracking.lastUpdated = new Date();

  // Add to tracking history
  const locationUpdate: ILocationUpdate = {
    userId: mechanicId,
    userType: 'mechanic',
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    timestamp: new Date(),
    ...additionalData
  };

  tracking.trackingHistory.push(locationUpdate);

  // Check if mechanic has arrived (within 100 meters)
  if (newDistance <= 0.1 && tracking.status !== 'arrived') {
    tracking.status = 'arrived';
    trackingEventEmitter.emit('mechanicArrived', {
      orderId,
      userId: tracking.userId,
      mechanicId,
      distance: newDistance
    });
  }

  await tracking.save();

  // Emit real-time update
  trackingEventEmitter.emit('locationUpdate', {
    orderId,
    userId: tracking.userId,
    mechanicId,
    distance: newDistance,
    estimatedArrival: tracking.estimatedArrival,
    mechanicLocation: { longitude, latitude },
    status: tracking.status
  });

  return tracking;
};

export const updateUserLocationIntoDB = async (
  orderId: string,
  userId: string,
  longitude: number,
  latitude: number
): Promise<IDistanceTracking | null> => {
  const tracking = await DistanceTrackingModel.findOne({ 
    orderId, 
    userId,
    status: { $in: ['pending', 'in_progress'] }
  });

  if (!tracking) {
    throw new Error('Active tracking session not found');
  }

  // Update user location
  tracking.userLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  // Recalculate distance
  const newDistance = calculateDistance(
    latitude, // user latitude
    longitude, // user longitude
    tracking.mechanicLocation.coordinates[1], // mechanic latitude
    tracking.mechanicLocation.coordinates[0]  // mechanic longitude
  );

  tracking.distance = newDistance;
  tracking.estimatedArrival = calculateETA(newDistance);
  tracking.lastUpdated = new Date();

  // Add to tracking history
  const locationUpdate: ILocationUpdate = {
    userId,
    userType: 'user',
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    timestamp: new Date()
  };

  tracking.trackingHistory.push(locationUpdate);

  await tracking.save();

  // Emit real-time update
  trackingEventEmitter.emit('locationUpdate', {
    orderId,
    userId,
    mechanicId: tracking.mechanicId,
    distance: newDistance,
    estimatedArrival: tracking.estimatedArrival,
    userLocation: { longitude, latitude },
    status: tracking.status
  });

  return tracking;
};

export const getTrackingInfoFromDB = async (orderId: string): Promise<IDistanceTracking | null> => {
  return await DistanceTrackingModel.findOne({ orderId });
};


export const completeTrackingIntoDB = async (orderId: string): Promise<void> => {
  await DistanceTrackingModel.findOneAndUpdate(
    {  orderId },
    { 
      status: 'completed',
      lastUpdated: new Date()
    }
  );

  trackingEventEmitter.emit('trackingCompleted', { orderId: orderId });
};

/**
 * Cancel tracking session
 */
export const cancelTrackingIntoDB = async (orderId: string): Promise<void> => {
  await DistanceTrackingModel.findOneAndUpdate(
    { orderId },
    { 
      status: 'cancelled',
      lastUpdated: new Date()
    }
  );

  trackingEventEmitter.emit('trackingCancelled', { orderId });
};

/**
 * Find nearby mechanics within a specified radius
 */
export const findNearbyMechanics = async (
  longitude: number, 
  latitude: number, 
  radiusInKm: number = 10
): Promise<any[]> => {
  return await UserModel.find({
    userType: 'mechanic',
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusInKm / 6371]
      }
    },
    isAvailable: true
  }).select('name location phone rating');
};

/**
 * Get tracking history for a service request
 */
export const getTrackingHistory = async (orderId: string): Promise<ILocationUpdate[]> => {
  const tracking = await DistanceTrackingModel.findOne({ orderId });
  return tracking?.trackingHistory || [];
};

// export const updateMechanicLocationIntoDB = async (
//   serviceRequestId: string, 
//   mechanicId: string, 
//   longitude: number, 
//   latitude: number,
//   additionalData?: { accuracy?: number; speed?: number; heading?: number }
// ): Promise<IDistanceTracking | null> => {
//   const tracking = await DistanceTrackingModel.findOne({ 
//     serviceRequestId, 
//     mechanicId,
//     status: { $in: ['pending', 'in_progress'] }
//   });

//   if (!tracking) {
//     throw new Error('Active tracking session not found');
//   }

//   // Update mechanic location
//   tracking.mechanicLocation = {
//     type: 'Point',
//     coordinates: [longitude, latitude]
//   };

//   // Calculate new distance
//   const newDistance = calculateDistance(
//     tracking.userLocation.coordinates[1], // user latitude
//     tracking.userLocation.coordinates[0], // user longitude
//     latitude, // mechanic latitude
//     longitude  // mechanic longitude
//   );

//   tracking.distance = newDistance;
//   tracking.estimatedArrival = calculateETA(newDistance);
//   tracking.lastUpdated = new Date();

//   // Add to tracking history
//   const locationUpdate: ILocationUpdate = {
//     userId: mechanicId,
//     userType: 'mechanic',
//     location: {
//       type: 'Point',
//       coordinates: [longitude, latitude]
//     },
//     timestamp: new Date(),
//     ...additionalData
//   };

//   tracking.trackingHistory.push(locationUpdate);

//   // Check if mechanic has arrived (within 100 meters)
//   if (newDistance <= 0.1 && tracking.status !== 'arrived') {
//     tracking.status = 'arrived';
//     trackingEventEmitter.emit('mechanicArrived', {
//       serviceRequestId,
//       userId: tracking.userId,
//       mechanicId,
//       distance: newDistance
//     });
//   }

//   await tracking.save();

//   // Emit real-time update
//   trackingEventEmitter.emit('locationUpdate', {
//     serviceRequestId,
//     userId: tracking.userId,
//     mechanicId,
//     distance: newDistance,
//     estimatedArrival: tracking.estimatedArrival,
//     mechanicLocation: { longitude, latitude },
//     status: tracking.status
//   });

//   return tracking;
// };