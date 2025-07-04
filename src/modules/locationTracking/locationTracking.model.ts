import mongoose, { Types } from "mongoose";
import { IDistanceTracking, ILocationUpdate } from "./locationTracking.interface";
import { Schema } from "mongoose";

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
  orderId: { type: Schema.Types.ObjectId , ref:"Order", required: true},
  userId: { type: Schema.Types.ObjectId, ref:"User", required: true },
  mechanicId: { type: Schema.Types.ObjectId, ref:"User", required: true },
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
