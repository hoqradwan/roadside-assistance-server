import { Types } from "mongoose";

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
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  mechanicId: Types.ObjectId;
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
