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

// Extend Socket interface to include userId and userRole
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    userRole?: string;
  }
}

let io: Server | undefined;

// Enhanced user tracking with role information
interface OnlineUser {
  socketId: string;
  userId: string;
  role: string;
  connectedAt: Date;
}

const initSocketIO = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URLS?.split(',') || ["http://localhost:5000"], // More secure CORS
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'], // Explicit transports
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Enhanced tracking of online users
  const onlineUsers = new Map<string, OnlineUser>();

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.token || 
                   socket.handshake.headers.authorization;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const userData = getUserData(token as string);
      if (!userData || !userData.id) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Attach user data to socket
      socket.userId = userData.id;
      socket.userRole = (userData as any).role || 'user';
      
      next();
    } catch (error) {
      logger.error(colors.red(`Socket authentication error: ${error}`));
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    logger.info(colors.blue(`🔌🟢 New connection: ${socket.id} - User: ${socket.userId}`));

    // Automatically handle user connection
    if (socket.userId) {
      // Remove any existing connection for this user (handle multiple tabs/devices)
      const existingUser = Array.from(onlineUsers.values()).find(user => user.userId === socket.userId);
      if (existingUser) {
        onlineUsers.delete(existingUser.socketId);
        // Optionally disconnect the old socket
        const oldSocket = io?.sockets.sockets.get(existingUser.socketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }
      }

      // Add new user connection
      onlineUsers.set(socket.id, {
        socketId: socket.id,
        userId: socket.userId,
        role: socket.userRole || 'user',
        connectedAt: new Date()
      });

      // Join user's personal room
      socket.join(`user:${socket.userId}`);
      
      // Emit user online status to relevant users (optional)
      socket.broadcast.emit('user-online', { userId: socket.userId });
      
      logger.info(colors.green(`User ${socket.userId} authenticated and joined personal room`));
    }

    // Enhanced private messaging with proper validation and delivery confirmation
    socket.on('send-message', async (data: { 
      to: string; 
      message: string; 
      messageType?: 'text' | 'image' | 'file';
      tempId?: string; // For client-side message tracking
    }, callback) => {
      try {
        const { to, message, messageType = 'text', tempId } = data;

        // Validation
        if (!socket.userId) {
          const error = 'Unauthorized: User not authenticated';
          socket.emit('message-error', { error, tempId });
          return callback?.({ success: false, error });
        }

        if (socket.userId === to) {
          const error = 'Cannot send message to yourself';
          socket.emit('message-error', { error, tempId });
          return callback?.({ success: false, error });
        }

        if (!message || message.trim().length === 0) {
          const error = 'Message cannot be empty';
          socket.emit('message-error', { error, tempId });
          return callback?.({ success: false, error });
        }

        // Check if recipient exists
        const recipient = await UserModel.findById(to).select('_id image name');
        if (!recipient) {
          const error = 'Recipient not found';
          socket.emit('message-error', { error, tempId });
          return callback?.({ success: false, error });
        }

        // Get sender info
        const sender = await UserModel.findById(socket.userId).select('image name');

        // Save message to database
        const messageDoc = await ChatMessage.create({
          sender: socket.userId,
          receiver: to,
          message: message.trim(),
          messageType,
          timestamp: new Date(),
          delivered: false,
          read: false
        });

        // Prepare message object for emission
        const messagePayload = {
          _id: messageDoc._id,
          sender: socket.userId,
          receiver: to,
          message: messageDoc.message,
          messageType: (messageDoc as any).messageType,
          timestamp: messageDoc.timestamp,
          delivered: false,
          read: false,
          senderInfo: {
            id: socket.userId,
            name: sender?.name,
            image: sender?.image
          },
          receiverInfo: {
            id: to,
            name: recipient.name,
            image: recipient.image
          },
          tempId
        };

        // Check if recipient is online
        const recipientConnection = Array.from(onlineUsers.values())
          .find(user => user.userId === to);

        let delivered = false;
        if (recipientConnection) {
          // Send to recipient's personal room
          io?.to(`user:${to}`).emit('new-message', messagePayload);
          delivered = true;
          
          // Update delivery status
          await ChatMessage.findByIdAndUpdate(messageDoc._id, { delivered: true });
          messagePayload.delivered = true;
        }

        // Send confirmation back to sender
        socket.emit('message-sent', {
          ...messagePayload,
          delivered
        });

        // Send acknowledgment to sender via callback
        callback?.({ 
          success: true, 
          messageId: messageDoc._id, 
          delivered,
          tempId 
        });

        logger.info(colors.cyan(`Message sent from ${socket.userId} to ${to} - Delivered: ${delivered}`));

      } catch (error) {
        logger.error(colors.red(`Error sending message: ${error}`));
        const errorMsg = 'Failed to send message';
        socket.emit('message-error', { error: errorMsg, tempId: data.tempId });
        callback?.({ success: false, error: errorMsg });
      }
    });

    // Message delivery confirmation
    socket.on('message-delivered', async (messageId: string) => {
      try {
        await ChatMessage.findByIdAndUpdate(messageId, { delivered: true });
        
        // Notify sender about delivery
        const message = await ChatMessage.findById(messageId).select('sender');
        if (message) {
          io?.to(`user:${message.sender}`).emit('message-delivery-confirmed', { messageId });
        }
      } catch (error) {
        logger.error(colors.red(`Error updating message delivery: ${error}`));
      }
    });

    // Message read confirmation
    socket.on('message-read', async (messageId: string) => {
      try {
        await ChatMessage.findByIdAndUpdate(messageId, { read: true });
        
        // Notify sender about read status
        const message = await ChatMessage.findById(messageId).select('sender');
        if (message) {
          io?.to(`user:${message.sender}`).emit('message-read-confirmed', { messageId });
        }
      } catch (error) {
        logger.error(colors.red(`Error updating message read status: ${error}`));
      }
    });

    // Get chat history
    socket.on('get-chat-history', async (data: { 
      withUserId: string; 
      page?: number; 
      limit?: number 
    }, callback) => {
      try {
        const { withUserId, page = 1, limit = 50 } = data;
        
        if (!socket.userId) {
          return callback?.({ success: false, error: 'Unauthorized' });
        }

        const skip = (page - 1) * limit;
        
        const messages = await ChatMessage.find({
          $or: [
            { sender: socket.userId, receiver: withUserId },
            { sender: withUserId, receiver: socket.userId }
          ]
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('sender', 'name image')
        .populate('receiver', 'name image');

        callback?.({ 
          success: true, 
          messages: messages.reverse(), // Reverse to get chronological order
          hasMore: messages.length === limit 
        });

      } catch (error) {
        logger.error(colors.red(`Error fetching chat history: ${error}`));
        callback?.({ success: false, error: 'Failed to fetch chat history' });
      }
    });

    // Join service request room with enhanced error handling
    socket.on('join-service-room', async (orderId: string, callback) => {
      try {
        if (!socket.userId) {
          const error = 'Unauthorized';
          socket.emit('join-room-error', { error, roomType: 'service', roomId: orderId });
          return callback?.({ success: false, error });
        }

        const order = await Order.findById(orderId);
        if (!order) {
          const error = 'Order not found';
          socket.emit('join-room-error', { error, roomType: 'service', roomId: orderId });
          return callback?.({ success: false, error });
        }

        // Check if user has permission to join this service room
        const canJoin = order.user.toString() === socket.userId || 
                       order.mechanic?.toString() === socket.userId ||
                       socket.userRole === 'admin';

        if (!canJoin) {
          const error = 'Access denied to this service room';
          socket.emit('join-room-error', { error, roomType: 'service', roomId: orderId });
          return callback?.({ success: false, error });
        }

        socket.join(`service:${orderId}`);
        socket.emit('joined-service-room', { orderId, order });
        
        // Notify others in the room
        socket.to(`service:${orderId}`).emit('user-joined-service-room', { 
          userId: socket.userId, 
          orderId 
        });

        callback?.({ success: true, orderId });
        logger.info(colors.green(`User ${socket.userId} joined service room: ${orderId}`));

      } catch (error) {
        logger.error(colors.red(`Error joining service room: ${error}`));
        const errorMsg = 'Failed to join service room';
        socket.emit('join-room-error', { error: errorMsg, roomType: 'service', roomId: orderId });
        callback?.({ success: false, error: errorMsg });
      }
    });

    // Enhanced location tracking with validation
    socket.on('update-location', async (data: {
      orderId: string;
      userType: 'user' | 'mechanic';
      longitude: number;
      latitude: number;
    }, callback) => {
      try {
        const { orderId, userType, longitude, latitude } = data;

        if (!socket.userId) {
          return callback?.({ success: false, error: 'Unauthorized' });
        }

        // Validate coordinates
        if (typeof longitude !== 'number' || typeof latitude !== 'number' ||
            longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
          return callback?.({ success: false, error: 'Invalid coordinates' });
        }

        let result;
        if (userType === 'mechanic') {
          result = await updateMechanicLocationIntoDB(orderId, socket.userId, longitude, latitude);
        } else {
          result = await updateUserLocationIntoDB(orderId, socket.userId, longitude, latitude);
        }

        // Broadcast location update to service room
        socket.to(`service:${orderId}`).emit('location-updated', {
          userId: socket.userId,
          userType,
          longitude,
          latitude,
          timestamp: new Date()
        });

        callback?.({ success: true, result });

      } catch (error) {
        logger.error(colors.red(`Error updating location: ${error}`));
        callback?.({ success: false, error: 'Failed to update location' });
      }
    });

    // Handle user going offline/online status
    socket.on('set-status', (status: 'online' | 'away' | 'busy') => {
      if (socket.userId) {
        const user = onlineUsers.get(socket.id);
        if (user) {
          // Broadcast status change
          socket.broadcast.emit('user-status-changed', { 
            userId: socket.userId, 
            status 
          });
        }
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { toUserId: string }) => {
      if (socket.userId) {
        io?.to(`user:${data.toUserId}`).emit('user-typing', { 
          userId: socket.userId,
          typing: true 
        });
      }
    });

    socket.on('typing-stop', (data: { toUserId: string }) => {
      if (socket.userId) {
        io?.to(`user:${data.toUserId}`).emit('user-typing', { 
          userId: socket.userId,
          typing: false 
        });
      }
    });

    // Enhanced disconnection handling
    socket.on('disconnect', (reason) => {
      if (socket.userId) {
        onlineUsers.delete(socket.id);
        
        // Broadcast user offline status
        socket.broadcast.emit('user-offline', { userId: socket.userId });
        
        logger.info(colors.yellow(`User ${socket.userId} disconnected: ${reason}`));
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(colors.red(`Socket error for user ${socket.userId}: ${error}`));
    });
  });

  logger.info(colors.green('Socket.IO initialized with enhanced one-to-one chat system'));
};

export { initSocketIO, io };

// Enhanced notification system
export const emitNotification = async ({
  userId,
  userMsg,
  adminMsg,
  type = 'general',
  data = {}
}: {
  userId: ObjectId;
  userMsg?: string;
  adminMsg?: string;
  type?: string;
  data?: any;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  try {
    // Get admin IDs
    const admins = await UserModel.find({ role: "admin" }).select("_id");
    
    // Notify the specific user
    if (userMsg) {
      io.to(`user:${userId}`).emit('notification', {
        type,
        message: userMsg,
        data,
        timestamp: new Date()
      });
    }

    // Notify all admins
    if (adminMsg && admins.length > 0) {
      for (const admin of admins) {
        io.to(`user:${admin._id}`).emit('notification', {
          type: 'admin',
          message: adminMsg,
          userId,
          data,
          timestamp: new Date()
        });
      }
    }

    // Save notification to the database
    await NotificationModel.create<INotification>({
      userId,
      adminId: admins[0]?._id || "",
      adminMsg,
      userMsg,
      type,
      data
    });

    logger.info(colors.green(`Notification sent to user ${userId} and ${admins.length} admins`));

  } catch (error) {
    logger.error(colors.red(`Error emitting notification: ${error}`));
    throw error;
  }
};

// Utility function to get online users (for admin dashboard, etc.)
export const getOnlineUsers = (): OnlineUser[] => {
  if (!io) return [];
  
  const onlineUsers = new Map<string, OnlineUser>();
  // This would need to be properly implemented based on your tracking mechanism
  return Array.from(onlineUsers.values());
};
// FIX 19: Enhanced connection status monitoring
export const getConnectionStats = () => {
    if (!io) return { connected: 0, total: 0 };

    const sockets = io.sockets.sockets;
    const connected = Array.from(sockets.values()).filter(s => s.connected).length;

    return {
        connected,
        total: sockets.size,
        timestamp: new Date()
    };
};

// FIX 20: Graceful shutdown handling
export const gracefulShutdown = () => {
    if (io) {
        logger.info(colors.yellow('🔌 Initiating graceful Socket.IO shutdown...'));

        // Notify all clients about server shutdown
        io.emit('server_shutdown', {
            message: 'Server is shutting down',
            timestamp: new Date()
        });

        // Give clients time to handle the notification
        setTimeout(() => {
            io?.close((error) => {
                if (error) {
                    logger.error(colors.red(`❌ Error during Socket.IO shutdown: ${error}`));
                } else {
                    logger.info(colors.green('✅ Socket.IO shutdown complete'));
                }
            });
        }, 2000);
    }
};

// export const emitNotification = async ({
//     userId,
//     userMsg,
//     adminMsg,
// }: {
//     userId: ObjectId;
//     userMsg?: string;
//     adminMsg?: string;
// }): Promise<void> => {
//     if (!io) {
//         throw new Error("Socket.IO is not initialized");
//     }
//     console.log(userMsg, userId)
//     // Get admin IDs
//     const admin = await UserModel.findOne({ role: "admin" }).select("_id");
//     const adminId = admin._id;
//     // Notify the specific user
//     if (userMsg) {
//         io.emit(`notification::${userId}`, {
//             userId,
//             message: userMsg, // userMsg is passed as ILocalizedString (plain object)
//         });
//     }

//     // Notify all admins
//     if (adminMsg) {
//         io.emit(`notification::${adminId}`, {
//             adminId,
//             message: adminMsg, // adminMsg is passed as ILocalizedString (plain object)
//         });
//     }

//     // Save notification to the database
//     await NotificationModel.create<INotification>({
//         userId,
//         adminId: adminId || "",
//         adminMsg: adminMsg, // Stored as ILocalizedString
//         userMsg: userMsg, // Stored as ILocalizedString
//     });
// };
