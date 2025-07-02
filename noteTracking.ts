/* 

// utils/distance.utils.ts
/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate estimated time of arrival based on distance and average speed
 * @param distance Distance in kilometers
 * @param averageSpeed Average speed in km/h (default: 30 km/h for city driving)
 * @returns ETA in minutes
 */
export const calculateETA = (distance: number, averageSpeed: number = 30): number => {
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = timeInHours * 60;
  return Math.round(timeInMinutes);
};

// models/tracking.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILocationUpdate {
  userId: string;
  userType: 'user' | 'mechanic';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  timestamp: Date;
  accuracy?: number; // GPS accuracy in meters
  speed?: number; // Speed in km/h
  heading?: number; // Direction in degrees
}

export interface IDistanceTracking extends Document {
  serviceRequestId: string;
  userId: string;
  mechanicId: string;
  userLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  mechanicLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  distance: number; // in kilometers
  estimatedArrival: number; // in minutes
  status: 'pending' | 'in_progress' | 'arrived' | 'completed' | 'cancelled';
  lastUpdated: Date;
  trackingHistory: ILocationUpdate[];
}

const LocationUpdateSchema = new Schema<ILocationUpdate>({
  userId: { type: String, required: true },
  userType: { type: String, enum: ['user', 'mechanic'], required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  timestamp: { type: Date, default: Date.now },
  accuracy: Number,
  speed: Number,
  heading: Number
});

const DistanceTrackingSchema = new Schema<IDistanceTracking>({
  serviceRequestId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  mechanicId: { type: String, required: true },
  userLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  mechanicLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  distance: { type: Number, required: true },
  estimatedArrival: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'arrived', 'completed', 'cancelled'],
    default: 'pending'
  },
  lastUpdated: { type: Date, default: Date.now },
  trackingHistory: [LocationUpdateSchema]
}, { timestamps: true });

// Create indexes for geospatial queries
DistanceTrackingSchema.index({ userLocation: "2dsphere" });
DistanceTrackingSchema.index({ mechanicLocation: "2dsphere" });
DistanceTrackingSchema.index({ serviceRequestId: 1 });

export const DistanceTrackingModel = mongoose.model<IDistanceTracking>("DistanceTracking", DistanceTrackingSchema);

// services/tracking.service.ts
import { DistanceTrackingModel, IDistanceTracking, ILocationUpdate } from '../models/tracking.model';
import { UserModel } from '../models/user.model';
import { calculateDistance, calculateETA } from '../utils/distance.utils';
import { EventEmitter } from 'events';

// Create a single event emitter instance for tracking events
export const trackingEventEmitter = new EventEmitter();

/**
 * Initialize tracking for a service request
 */
export const initializeTracking = async (
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

/**
 * Update mechanic location and recalculate distance
 */
export const updateMechanicLocation = async (
  serviceRequestId: string, 
  mechanicId: string, 
  longitude: number, 
  latitude: number,
  additionalData?: { accuracy?: number; speed?: number; heading?: number }
): Promise<IDistanceTracking | null> => {
  const tracking = await DistanceTrackingModel.findOne({ 
    serviceRequestId, 
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
      serviceRequestId,
      userId: tracking.userId,
      mechanicId,
      distance: newDistance
    });
  }

  await tracking.save();

  // Emit real-time update
  trackingEventEmitter.emit('locationUpdate', {
    serviceRequestId,
    userId: tracking.userId,
    mechanicId,
    distance: newDistance,
    estimatedArrival: tracking.estimatedArrival,
    mechanicLocation: { longitude, latitude },
    status: tracking.status
  });

  return tracking;
};

/**
 * Update user location (if user moves)
 */
export const updateUserLocation = async (
  serviceRequestId: string,
  userId: string,
  longitude: number,
  latitude: number
): Promise<IDistanceTracking | null> => {
  const tracking = await DistanceTrackingModel.findOne({ 
    serviceRequestId, 
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
    serviceRequestId,
    userId,
    mechanicId: tracking.mechanicId,
    distance: newDistance,
    estimatedArrival: tracking.estimatedArrival,
    userLocation: { longitude, latitude },
    status: tracking.status
  });

  return tracking;
};

/**
 * Get current tracking information
 */
export const getTrackingInfo = async (serviceRequestId: string): Promise<IDistanceTracking | null> => {
  return await DistanceTrackingModel.findOne({ serviceRequestId });
};

/**
 * Complete tracking session
 */
export const completeTracking = async (serviceRequestId: string): Promise<void> => {
  await DistanceTrackingModel.findOneAndUpdate(
    { serviceRequestId },
    { 
      status: 'completed',
      lastUpdated: new Date()
    }
  );

  trackingEventEmitter.emit('trackingCompleted', { serviceRequestId });
};

/**
 * Cancel tracking session
 */
export const cancelTracking = async (serviceRequestId: string): Promise<void> => {
  await DistanceTrackingModel.findOneAndUpdate(
    { serviceRequestId },
    { 
      status: 'cancelled',
      lastUpdated: new Date()
    }
  );

  trackingEventEmitter.emit('trackingCancelled', { serviceRequestId });
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
export const getTrackingHistory = async (serviceRequestId: string): Promise<ILocationUpdate[]> => {
  const tracking = await DistanceTrackingModel.findOne({ serviceRequestId });
  return tracking?.trackingHistory || [];
};

// controllers/tracking.controller.ts
import { Request, Response } from 'express';
import * as trackingService from '../services/tracking.service';
import { io } from '../server'; // Assuming you have Socket.IO setup

// Set up event listeners for real-time updates
trackingService.trackingEventEmitter.on('locationUpdate', (data) => {
  // Emit to specific room (service request)
  io.to(`service-${data.serviceRequestId}`).emit('locationUpdate', data);
  
  // Also emit to user and mechanic specific rooms
  io.to(`user-${data.userId}`).emit('locationUpdate', data);
  io.to(`mechanic-${data.mechanicId}`).emit('locationUpdate', data);
});

trackingService.trackingEventEmitter.on('mechanicArrived', (data) => {
  io.to(`service-${data.serviceRequestId}`).emit('mechanicArrived', data);
  io.to(`user-${data.userId}`).emit('mechanicArrived', data);
});

trackingService.trackingEventEmitter.on('trackingCompleted', (data) => {
  io.to(`service-${data.serviceRequestId}`).emit('trackingCompleted', data);
});

trackingService.trackingEventEmitter.on('trackingCancelled', (data) => {
  io.to(`service-${data.serviceRequestId}`).emit('trackingCancelled', data);
});

/**
 * Initialize tracking for a service request
 */
export const initializeTrackingController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId, userId, mechanicId } = req.body;

    const tracking = await trackingService.initializeTracking(
      serviceRequestId,
      userId,
      mechanicId
    );

    res.status(201).json({
      success: true,
      message: 'Tracking initialized successfully',
      data: tracking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to initialize tracking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update mechanic location
 */
export const updateMechanicLocationController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;
    const { mechanicId, longitude, latitude, accuracy, speed, heading } = req.body;

    const tracking = await trackingService.updateMechanicLocation(
      serviceRequestId,
      mechanicId,
      longitude,
      latitude,
      { accuracy, speed, heading }
    );

    res.status(200).json({
      success: true,
      message: 'Mechanic location updated successfully',
      data: {
        distance: tracking?.distance,
        estimatedArrival: tracking?.estimatedArrival,
        status: tracking?.status
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update mechanic location',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update user location
 */
export const updateUserLocationController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;
    const { userId, longitude, latitude } = req.body;

    const tracking = await trackingService.updateUserLocation(
      serviceRequestId,
      userId,
      longitude,
      latitude
    );

    res.status(200).json({
      success: true,
      message: 'User location updated successfully',
      data: {
        distance: tracking?.distance,
        estimatedArrival: tracking?.estimatedArrival,
        status: tracking?.status
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update user location',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get current tracking information
 */
export const getTrackingInfoController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;

    const tracking = await trackingService.getTrackingInfo(serviceRequestId);

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Tracking information not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Complete tracking
 */
export const completeTrackingController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;

    await trackingService.completeTracking(serviceRequestId);

    res.status(200).json({
      success: true,
      message: 'Tracking completed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to complete tracking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Cancel tracking
 */
export const cancelTrackingController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;

    await trackingService.cancelTracking(serviceRequestId);

    res.status(200).json({
      success: true,
      message: 'Tracking cancelled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to cancel tracking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Find nearby mechanics
 */
export const findNearbyMechanicsController = async (req: Request, res: Response) => {
  try {
    const { longitude, latitude, radius = 10 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const mechanics = await trackingService.findNearbyMechanics(
      parseFloat(longitude as string),
      parseFloat(latitude as string),
      parseFloat(radius as string)
    );

    res.status(200).json({
      success: true,
      data: mechanics,
      count: mechanics.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby mechanics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get tracking history
 */
export const getTrackingHistoryController = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;

    const history = await trackingService.getTrackingHistory(serviceRequestId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get tracking history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// routes/tracking.routes.ts
import { Router } from 'express';
import * as trackingController from '../controllers/tracking.controller';

const router = Router();

// Initialize tracking
router.post('/initialize', trackingController.initializeTrackingController);

// Update locations
router.put('/:serviceRequestId/mechanic-location', trackingController.updateMechanicLocationController);
router.put('/:serviceRequestId/user-location', trackingController.updateUserLocationController);

// Get tracking info
router.get('/:serviceRequestId', trackingController.getTrackingInfoController);
router.get('/:serviceRequestId/history', trackingController.getTrackingHistoryController);

// Complete/Cancel tracking
router.put('/:serviceRequestId/complete', trackingController.completeTrackingController);
router.put('/:serviceRequestId/cancel', trackingController.cancelTrackingController);

// Find nearby mechanics
router.get('/mechanics/nearby', trackingController.findNearbyMechanicsController);

export default router;

// Socket.IO setup for real-time communication
// server.ts or app.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import trackingRoutes from './routes/tracking.routes';

const app = express();
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join service request room
  socket.on('joinServiceRoom', (serviceRequestId: string) => {
    socket.join(`service-${serviceRequestId}`);
    console.log(`Socket ${socket.id} joined service room: service-${serviceRequestId}`);
  });

  // Join user-specific room
  socket.on('joinUserRoom', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room: user-${userId}`);
  });

  // Join mechanic-specific room
  socket.on('joinMechanicRoom', (mechanicId: string) => {
    socket.join(`mechanic-${mechanicId}`);
    console.log(`Socket ${socket.id} joined mechanic room: mechanic-${mechanicId}`);
  });

  // Handle real-time location updates from clients
  socket.on('updateLocation', async (data) => {
    try {
      const { serviceRequestId, userType, userId, longitude, latitude } = data;
      
      if (userType === 'mechanic') {
        await trackingService.updateMechanicLocation(serviceRequestId, userId, longitude, latitude);
      } else {
        await trackingService.updateUserLocation(serviceRequestId, userId, longitude, latitude);
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware and routes
app.use(express.json());
app.use('/api/tracking', trackingRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { server };

*/