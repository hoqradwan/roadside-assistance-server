
import { get, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose, { ObjectId } from 'mongoose';
import { logger } from '../logger/logger';
import colors from 'colors';
import { ChatMessage } from '../modules/Chat/chat.model';
import { getUserData } from './getUserData';
import { NotificationModel } from '../modules/notifications/notification.model';
import { INotification } from '../modules/notifications/notification.interface';
import { UserModel } from '../modules/user/user.model';
import { updateMechanicLocationIntoDB, updateUserLocationIntoDB } from '../modules/locationTracking/locationTracking.service';
import Order from '../modules/Order/order.model';

// Extend Socket interface to include userId
declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}

let io: Server | undefined;

const initSocketIO = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust according to your needs
      methods: ["GET", "POST"]
    }
  });

  // Map to track online users (userId -> socketId)
  const onlineUsers = new Map<string, string>();

  let userData: any;

  io.on('connection', async (socket: Socket) => {

    logger.info(colors.blue(`🔌🟢 New connection: ${socket.id}`));

    // console.log('Socket connected token :', socket.handshake.headers.token);
    const token = socket.handshake.headers.token || socket.handshake.headers.authorization;

    if (!token) {
      logger.error(colors.red('No token provided'));
      socket.emit('error', 'Unauthorized');
      socket.disconnect();
      return;
    }

    userData = getUserData(token as string);


    // console.log("userData", userData);

    if (!userData) {
      logger.error(colors.red('Invalid token'));
      socket.emit('error', 'Unauthorized');
      socket.disconnect();
      return;
    }

    // Handle user authentication/connection
    socket.on('user-connect', () => {
      const userId = userData?.id;
      if (!userId) {
        logger.error(colors.red('User ID not found'));
        socket.emit('error', 'Unauthorized');
        socket.disconnect();
        return;
      }
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      socket.join(userId); // Join user's personal room

      logger.info(colors.green(`User ${userId} authenticated`));
    });

    // Handle private messages
    socket.on('send-message', async ({ to, message }: { to: string; message: string }) => {

      console.log('Message received:', { to, message });

      console.log("check user id", userData?.id)
      if (!userData?.id) {
        socket.emit('error', 'Unauthorized');
        return;
      }
      try {
        // Save message to database
        const messageResult = await ChatMessage.create({
          sender: userData?.id,
          receiver: to,
          message,
          timestamp: new Date()
        });


        // console.log({ onlineUsers });
        // Emit to recipient if online
        if (onlineUsers.has(to)) {
          const sockeId = onlineUsers.get(to);
          io?.to(to).emit('private-message', messageResult);
        }

        // Also send back to sender for their own UI
        socket.emit('send-message', messageResult);

      } catch (error) {
        logger.error(colors.red(`Error sending message: ${error}`));
        socket.emit('error', 'Failed to send message');
      }
    });
    // Join service request room
    socket.on('joinServiceRoom', async (orderId: string) => {
      try {
        console.log(`Attempting to join service room for order: ${orderId}`);

        const order = await Order.findById(orderId);
        console.log('Order found:', order ? 'Yes' : 'No');

        if (!order) {
          console.log('Order not found, emitting error');
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        socket.join(`service-${orderId}`);
        console.log(`Socket ${socket.id} joined service room: service-${orderId}`);

        // Add this log to confirm emission
        socket.emit("joinServiceRoom", order);

      } catch (error) {
        console.error('Error joining service room:', error);
        socket.emit('error', { message: 'Failed to join service room' });
      }
    });
    // socket.on("testMsg", (msg: string) => {
    //   console.log(msg);
    //   socket.emit("testMsg",msg);
    // })
    // Join user-specific room
    socket.on('joinUserRoom', (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} joined user room: user-${userId}`);
      socket.emit("joinUserRoom" , userId)
    });

    // Join mechanic-specific room
    socket.on('joinMechanicRoom', (mechanicId: string) => {
      socket.join(`mechanic-${mechanicId}`);
      console.log(`Socket ${socket.id} joined mechanic room: mechanic-${mechanicId}`);
    });

    // Handle real-time location updates from clients
    socket.on('updateLocation', async (data) => {
      try {
        const { orderId, userType, userId, longitude, latitude } = data;
        let result;
        if (userType === 'mechanic') {
         result = await updateMechanicLocationIntoDB(orderId, userId, longitude, latitude);
        } else {
         result = await updateUserLocationIntoDB(orderId, userId, longitude, latitude);
        }
        socket.emit("updateLocation",result);
      } catch (error) {
        socket.emit('error', { message: 'Failed to update location' });
      }
    });
    const locationBuffer: any = [];
    const LOCATION_LIMIT = 30;
    let lastUpdateTime = Date.now();

    socket.on("client_location", async (data, callback) => {
      const longitude = (data.lng);
      const latitude = (data.lat);
      const userId = data.user;
      console.log(latitude, longitude, userId)
      console.log(locationBuffer, "from socket")
      locationBuffer.push({ longitude, latitude });
      if (locationBuffer.length >= LOCATION_LIMIT) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastUpdateTime;
        console.log("in client location", locationBuffer, locationBuffer.length)

        if (timeElapsed >= 30 * 1000) {
          try {
            const lastLocation = locationBuffer[LOCATION_LIMIT - 1];

            const result = await UserModel.findByIdAndUpdate(
              userId,
              { $set: { "location.coordinates": [longitude, latitude] } },
              { new: true }
            );
            console.log(result)
            // const lastLocation = locationBuffer[LOCATION_LIMIT - 1];

            // console.log({"location.coordinates": lastLocation})
            // await User.findByIdAndUpdate(
            //   user?._id,
            //   { $set: { "location.coordinates": lastLocation } },
            //   { new: true }
            // );

            console.log("Database updated with location:", lastLocation);
            locationBuffer.length = 0;
            lastUpdateTime = Date.now();
          } catch (error) {
            console.error("Error updating the database");
          }
        } else {
          console.log(
            `Waiting for 1 minute. Time remaining: ${30 - Math.floor(timeElapsed / 1000)
            } seconds`
          );
        }
      }
      // io.emit(`server_location::${user?._id?.toString()}`, data);
      io?.emit(`server_location`, data);
    });
    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        logger.info(colors.yellow(`User ${socket.userId} disconnected`));
      }
    });
  });

  logger.info(colors.green('Socket.IO initialized for one-to-one chat'));
};
export { initSocketIO, io };

export const emitNotification = async ({
  userId,
  userMsg,
  adminMsg,
}: {
  userId: ObjectId;
  userMsg?: string;
  adminMsg?: string;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }
  console.log(userMsg, userId)
  // Get admin IDs
  const admin = await UserModel.findOne({ role: "admin" }).select("_id");
  const adminId = admin._id;
  // Notify the specific user
  if (userMsg) {
    io.emit(`notification::${userId}`, {
      userId,
      message: userMsg, // userMsg is passed as ILocalizedString (plain object)
    });
  }

  // Notify all admins
  if (adminMsg) {
    io.emit(`notification::${adminId}`, {
      adminId,
      message: adminMsg, // adminMsg is passed as ILocalizedString (plain object)
    });
  }

  // Save notification to the database
  await NotificationModel.create<INotification>({
    userId,
    adminId: adminId || "",
    adminMsg: adminMsg, // Stored as ILocalizedString
    userMsg: userMsg, // Stored as ILocalizedString
  });
};


/* 
  socket.on('joinServiceRoom', (serviceRequestId: string) => {
    socket.join(`service-${serviceRequestId}`);
    console.log(`Socket ${socket.id} joined service room: service-${serviceRequestId}`);
  });

  socket.on('joinUserRoom', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room: user-${userId}`);
  });

  socket.on('joinMechanicRoom', (mechanicId: string) => {
    socket.join(`mechanic-${mechanicId}`);
    console.log(`Socket ${socket.id} joined mechanic room: mechanic-${mechanicId}`);
  });


import { Router } from 'express';
import { initializeTracking, updateMechanicLocation, updateUserLocation, getTrackingInfo, completeTracking } from '../controllers/tracking.controller'; // Import functions

const router = Router();

// Initialize tracking
router.post('/initialize', initializeTracking);

// Update mechanic location
router.put('/:serviceRequestId/mechanic-location', updateMechanicLocation);

// Update user location
router.put('/:serviceRequestId/user-location', updateUserLocation);

// Get tracking info
router.get('/:serviceRequestId', getTrackingInfo);

// Complete tracking
router.put('/:serviceRequestId/complete', completeTracking);

export default router;

............................................................................
import { Request, Response } from 'express';
import { initializeTrackingService, updateMechanicLocationService, updateUserLocationService, getTrackingInfoService, completeTrackingService } from '../services/tracking.service';

export const initializeTracking = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId, userId, mechanicId } = req.body;
    const tracking = await initializeTrackingService(serviceRequestId, userId, mechanicId);
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

export const updateMechanicLocation = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;
    const { mechanicId, longitude, latitude, accuracy, speed, heading } = req.body;
    const tracking = await updateMechanicLocationService(serviceRequestId, mechanicId, longitude, latitude, { accuracy, speed, heading });
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

export const updateUserLocation = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;
    const { userId, longitude, latitude } = req.body;
    const tracking = await updateUserLocationService(serviceRequestId, userId, longitude, latitude);
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

export const getTrackingInfo = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;
    const tracking = await getTrackingInfoService(serviceRequestId);
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

export const completeTracking = async (req: Request, res: Response) => {
  try {
    const { serviceRequestId } = req.params;
    await completeTrackingService(serviceRequestId);
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
...........................................................................

import { DistanceTrackingModel } from '../models/tracking.model';
import { UserModel } from '../models/user.model';
import { DistanceUtils } from '../utils/distance.utils';
import { io } from '../server'; // Import Socket.IO instance

export const initializeTrackingService = async (serviceRequestId: string, userId: string, mechanicId: string) => {
  // Get user and mechanic locations
  const user = await UserModel.findById(userId);
  const mechanic = await UserModel.findById(mechanicId);

  if (!user || !mechanic) {
    throw new Error('User or mechanic not found');
  }

  // Calculate the distance between user and mechanic
  const distance = DistanceUtils.calculateDistance(
    user.location.coordinates[1], // user latitude
    user.location.coordinates[0], // user longitude
    mechanic.location.coordinates[1], // mechanic latitude
    mechanic.location.coordinates[0] // mechanic longitude
  );

  const estimatedArrival = DistanceUtils.calculateETA(distance);

  // Initialize a new tracking session
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
  io.to(`service-${serviceRequestId}`).emit('trackingInitialized', {
    serviceRequestId,
    userId,
    mechanicId,
    distance,
    estimatedArrival
  });

  return tracking;
};

export const updateMechanicLocationService = async (serviceRequestId: string, mechanicId: string, longitude: number, latitude: number, additionalData: any) => {
  const tracking = await DistanceTrackingModel.findOne({ 
    serviceRequestId, 
    mechanicId,
    status: { $in: ['pending', 'in_progress'] }
  });

  if (!tracking) {
    throw new Error('Tracking session not found');
  }

  // Update mechanic location
  tracking.mechanicLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  // Calculate new distance
  const newDistance = DistanceUtils.calculateDistance(
    tracking.userLocation.coordinates[1], // user latitude
    tracking.userLocation.coordinates[0], // user longitude
    latitude, // mechanic latitude
    longitude  // mechanic longitude
  );

  tracking.distance = newDistance;
  tracking.estimatedArrival = DistanceUtils.calculateETA(newDistance);
  tracking.lastUpdated = new Date();

  // Add location update to tracking history
  const locationUpdate = {
    userId: mechanicId,
    userType: 'mechanic',
    location: { type: 'Point', coordinates: [longitude, latitude] },
    timestamp: new Date(),
    ...additionalData
  };

  tracking.trackingHistory.push(locationUpdate);

  if (newDistance <= 0.1 && tracking.status !== 'arrived') {
    tracking.status = 'arrived';
    io.to(`service-${serviceRequestId}`).emit('mechanicArrived', {
      serviceRequestId,
      userId: tracking.userId,
      mechanicId,
      distance: newDistance
    });
  }

  await tracking.save();

  io.to(`service-${serviceRequestId}`).emit('locationUpdate', {
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

export const updateUserLocationService = async (serviceRequestId: string, userId: string, longitude: number, latitude: number) => {
  const tracking = await DistanceTrackingModel.findOne({ 
    serviceRequestId, 
    userId,
    status: { $in: ['pending', 'in_progress'] }
  });

  if (!tracking) {
    throw new Error('Tracking session not found');
  }

  // Update user location
  tracking.userLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  const newDistance = DistanceUtils.calculateDistance(
    latitude, // user latitude
    longitude, // user longitude
    tracking.mechanicLocation.coordinates[1], // mechanic latitude
    tracking.mechanicLocation.coordinates[0] // mechanic longitude
  );

  tracking.distance = newDistance;
  tracking.estimatedArrival = DistanceUtils.calculateETA(newDistance);
  tracking.lastUpdated = new Date();

  // Add location update to tracking history
  const locationUpdate = {
    userId,
    userType: 'user',
    location: { type: 'Point', coordinates: [longitude, latitude] },
    timestamp: new Date()
  };

  tracking.trackingHistory.push(locationUpdate);

  await tracking.save();

  io.to(`service-${serviceRequestId}`).emit('locationUpdate', {
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

export const getTrackingInfoService = async (serviceRequestId: string) => {
  return await DistanceTrackingModel.findOne({ serviceRequestId });
};

export const completeTrackingService = async (serviceRequestId: string) => {
  await DistanceTrackingModel.findOneAndUpdate(
    { serviceRequestId },
    { status: 'completed', lastUpdated: new Date() }
  );

  io.to(`service-${serviceRequestId}`).emit('trackingCompleted', { serviceRequestId });
};



*/

/* 

const { createLogger } = require("winston");
const logger = require("../helpers/logger");
const chatModel = require("../modules/Chat/chat.model");
const { getMyChatList } = require("../modules/Chat/chat.service");
const messageModel = require("../modules/Message/message.model");
const User = require("../modules/User/user.model");
const { chatService } = require("../modules/Chat/chat.service");
const socketAuthMiddleware = require("./auth/auth");
const { cpuCount } = require("os-utils");
const httpStatus = require("http-status");
const {
  addNotification,
} = require("../modules/Notification/notification.service");
 
async function getChatById(chatId) {
  try {
    const chat = await chatModel.findById(chatId).populate("loadId");
    console.log({ chat });
    if (!chat) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }
    return chat;
  } catch (error) {
    console.error("Error fetching chat:", error);
    throw error; // Rethrow to handle it in the calling function
  }
}
 
// const userLiveLocationShare = require("./features/userLiveLocationShare");
 
const drivers = {}; // Example storage for driver locations
const products = {}; // Example storage for product destinations
 
const collectLocation = [];
 
const socketIO = (io) => {
  //initialize an object to store the active users
  let activeUsers = {};
  io.use(socketAuthMiddleware);
  let onlineUsers = [];
 
  try {
    io.on("connection", (socket) => {
      //add the user to the active users list
      try {
        if (!activeUsers[socket?.decodedToken?._id]) {
          activeUsers[socket?.decodedToken?._id] = {
            ...socket?.decodedToken,
            id: socket?.decodedToken?._id,
          };
          console.log(
            `User Id: ${socket?.decodedToken?._id} is just connected.`
          );
        } else {
          console.log(
            `User Id: ${socket?.decodedToken?._id} is already connected.`
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        logger.error(error, "-- socket.io connection error --");
      }
 
      const user = socket.decodedToken;
 
      try {
        socket.on("join", (data) => {
          const chatId = data.toString();
          socket.join(chatId);
 
          const userId = user._id.toString();
 
          if (!onlineUsers.includes(userId)) {
            onlineUsers.push(userId);
          }
          io.emit("online-users-updated", onlineUsers);
        });
 
        socket.on("send-new-message", async (message, callback) => {
          console.log("new message ====>", { message });
 
          try {
            console.log("chat -> ", message.chat);
            // Assuming `getChatById` fetches the chat object including the users array
            const chat = await getChatById(message.chat);
 
            console.log({ chat });
 
            let newMessage;
            let userData;
            if (chat) {
              newMessage = await messageModel.create(message);
              // console.log("==== new Message ==== " ,{ newMessage });
              // console.log("==== chat Message ==== " ,{ chat });
 
              let receiverId;
              if (chat.chatType === "shipper-receiver") {
                console.log("==== user ===", user);
                console.log("==== receiver ===",chat.loadId.receiverId);
 
                if(user._id === chat.loadId.receiverId.toString()){
                  console.log('asdflkjaskldfjkasjfdkjdsfkj')
                  receiverId = chat.loadId.user;
                }
                else{
                  receiverId = chat.loadId.receiverId; // Assuming loadId has receiverId
                }
               
              } else if (chat.chatType === "shipper-driver") {
                if(user._id === chat.loadId.driver.toString()){
                  receiverId = chat.loadId.user;
                }
                else{
                  receiverId = chat.loadId.driver; // Assuming loadId has driver
                }
               
              } else if (chat.chatType === "driver-receiver") {
                if(user._id === chat.loadId.receiverId.toString()){
                  receiverId = chat.loadId.driver;
                }
                else{
                  receiverId = chat.loadId.receiverId; // Assuming loadId has driver
                }
              }
              // Emit notification to the receiver
              if (receiverId) {
                const onlineUser = onlineUsers.find((id) => id === receiverId?.toString());
                console.log("==== online User ==== ", onlineUser);
                if (!onlineUser) {
                  const notificationData = {
                    message: "You have got a new message",
                    type: "message",
                    role: socket.decodedToken.role,
                    linkId: newMessage._id,
                    sender: user._id,
                    receiver: receiverId,
                  };
                  await addNotification(notificationData);
                }
              }
            }
            // console.log(message?.chat);
            const chatId = message?.chat;
            socket
              .to(chatId)
              .emit(`new-message-received::${message?.chat}`, message);
            // io.to(chatId).emit(`new-message-received::${message?.chat}`, message);
            socket.emit(`new-message-received::${message?.chat}`, message);
 
            callback({ success: true, message: newMessage, result: message });
          } catch (error) {
            console.error("Error fetching chat details:", error);
          }
        });
 
        // typing functionality start
 
        socket.on("typing", async (message, callback) => {
 
          if (message.status === "true") {
            io.emit(`typing::${message.receiverId}`, true);
            callback({ success: true, message: message, result: message });
          } else {
            io.emit(`typing::${message.receiverId}`, false);
            callback({ success: false, message: message, result: message });
          }
        });
 
        // typing functionality end
 
        const locationBuffer = [];
        const LOCATION_LIMIT = 30;
        let lastUpdateTime = Date.now();
 
        socket.on("client_location", async (data, callback) => {
          const longitude = Number(data.lang);
          const latitude = Number(data.lat);
 
          // console.log(locationBuffer, "from socket")
          locationBuffer.push({ longitude, latitude });
 
          if (locationBuffer.length >= LOCATION_LIMIT) {
            const currentTime = Date.now();
            const timeElapsed = currentTime - lastUpdateTime;
            if (timeElapsed >= 30 * 1000) {
              try {
                const lastLocation = locationBuffer[LOCATION_LIMIT - 1];
                await User.findByIdAndUpdate(
                  user?._id,
                  { $set: { "location.coordinates": [longitude, latitude] } },
                  { new: true }
                );
 
                // const lastLocation = locationBuffer[LOCATION_LIMIT - 1];
 
                // console.log({"location.coordinates": lastLocation})
                // await User.findByIdAndUpdate(
                //   user?._id,
                //   { $set: { "location.coordinates": lastLocation } },
                //   { new: true }
                // );
 
                console.log("Database updated with location:", lastLocation);
                locationBuffer.length = 0;
                lastUpdateTime = Date.now();
              } catch (error) {
                console.error("Error updating the database:", error.message);
              }
            } else {
              console.log(
                `Waiting for 1 minute. Time remaining: ${
                  30 - Math.floor(timeElapsed / 1000)
                } seconds`
              );
            }
          }
          // io.emit(`server_location::${user?._id?.toString()}`, data);
          io.emit(`server_location`, data);
        });
 
        // Leave a chat room start
        socket.on("leave", (chatId) => {
          console.log(`${socket.id} left room ${chatId}`);
          socket.leave(chatId);
 
          // Remove user from onlineUsers
          const userId = socket?.decodedToken?._id?.toString();
          if (userId) {
            onlineUsers = onlineUsers.filter((id) => id !== userId);
            io.emit("online-users-updated", onlineUsers); // Notify all clients about the change
            console.log(`User ID: ${userId} removed from onlineUsers.`);
          }
        });
       
      } catch (error) {}
 
      socket.on("check", (data, callback) => {
        console.log("check event of socket in backend -> ", { data });
        callback({ success: true });
      });
 
      socket.on("disconnect", () => {
        delete activeUsers[socket?.decodedToken?._id];
        console.log(`User ID: ${socket?.decodedToken?._id} just disconnected`);
      });
    });
  } catch (error) {}
};
 
module.exports = socketIO;
 
 

*/