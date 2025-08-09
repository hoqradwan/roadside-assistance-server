import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import colors from 'colors';
import mongoose, { ObjectId } from 'mongoose';

import { logger } from '../logger/logger';
import { getUserData } from './getUserData';
import { ChatMessage } from '../modules/Chat/chat.model';
import { UserModel } from '../modules/user/user.model';
import Order from '../modules/Order/order.model';
import {
    updateMechanicLocationIntoDB,
    updateUserLocationIntoDB,
} from '../modules/locationTracking/locationTracking.service';
import { INotification } from '../modules/notifications/notification.interface';
import { NotificationModel } from '../modules/notifications/notification.model';

// Extend Socket interface
declare module 'socket.io' {
    interface Socket {
        userId?: string;
    }
}

let io: Server | undefined;

// Track online users: userId -> socketId
const onlineUsers = new Map<string, string>();

// Generate consistent conversationId
const generateConversationId = (userA: string, userB: string) =>
    [userA, userB].sort().join('_');

const initSocketIO = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', async (socket: Socket) => {
        logger.info(colors.blue(`🔌 New connection: ${socket.id}`));

        const token = socket.handshake.headers.token || socket.handshake.headers.authorization;
        if (!token) {
            socket.emit('error', 'Unauthorized: No token provided');
            return socket.disconnect();
        }

        let userData;
        try {
            userData = await getUserData(token as string);
        } catch (err) {
            socket.emit('error', 'Unauthorized: Invalid token');
            return socket.disconnect();
        }

        const userId = userData?.id;
        if (!userId) {
            socket.emit('error', 'Unauthorized: No userId found');
            return socket.disconnect();
        }

        // Mark user online
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId);
        logger.info(colors.green(`✅ User ${userId} connected`));

        // --- 1️⃣ One-to-One Messaging ---
        // socket.on('send-message', async ({ to, message }: { to: string; message: string }) => {
        //   if (!to || !message) return socket.emit('error', 'Recipient and message are required');
        //   if (to === userId) return socket.emit('error', 'Cannot message yourself');

        //   try {
        //     const conversationId = generateConversationId(userId, to);

        //     const messageDoc = await ChatMessage.create({
        //       sender: userId,
        //       receiver: to,
        //       message,
        //       conversationId,
        //       timestamp: new Date(),
        //     });

        //     const [sender, receiver] = await Promise.all([
        //       UserModel.findById(userId).select('image'),
        //       UserModel.findById(to).select('image'),
        //     ]);

        //     const payload = {
        //       ...messageDoc.toObject(),
        //       senderImage: sender?.image || null,
        //       receiverImage: receiver?.image || null,
        //     };

        //     // Deliver message to recipient
        //     if (onlineUsers.has(to)) {
        //       io?.to(to).emit('private-message', payload);
        //     }

        //     // Confirm to sender
        //     socket.emit('send-message', payload);

        //     logger.info(colors.cyan(`💬 Message sent from ${userId} to ${to}`));
        //   } catch (err) {
        //     logger.error(colors.red(`❌ Failed to send message: ${err}`));
        //     socket.emit('error', 'Message failed to send');
        //   }
        // });
        socket.on('send-message', async ({ to, message }: { to: string; message: string }) => {
            if (!to || !message) return socket.emit('error', 'Recipient and message are required');
            if (to === userId) return socket.emit('error', 'Cannot message yourself');

            try {
                // Generate a conversation ID
                const conversationId = generateConversationId(userId, to);

        

                // Fetch the sender and receiver images for message payload
                const [sender, receiver] = await Promise.all([
                    UserModel.findById(userId).select('image'),
                    UserModel.findById(to).select('image'),
                ]);
                        // Save the message to the database
                const messageDoc = await ChatMessage.create({
                    sender: userId,
                    receiver: to,
                    message,
                    conversationId,
                    timestamp: new Date(),
                });

                const payload = {
                    ...messageDoc.toObject(),
                    senderImage: sender?.image || null,
                    receiverImage: receiver?.image || null,
                };
                // Join both sender and receiver to the conversation room (by conversationId)
                socket.join(conversationId);
                io?.to(conversationId).emit('private-message', payload);  // Emit to both sender and receiver's room

                // Confirm message sent to the sender
                io?.emit('message-sent', payload);

                // Also ensure recipient is in the room
                if (onlineUsers.has(to)) {
                    io?.to(to).emit('private-message', payload);
                }

                logger.info(colors.cyan(`💬 Message sent from ${userId} to ${to}, Conversation ID: ${conversationId}`));
            } catch (err) {
                logger.error(colors.red(`❌ Failed to send message: ${err}`));
                socket.emit('error', 'Message failed to send');
            }
        });

        // --- 2️⃣ Service Room Join ---
        socket.on('joinServiceRoom', async (orderId: string) => {
            try {
                const order = await Order.findById(orderId);
                if (!order) return socket.emit('error', { message: 'Order not found' });

                socket.join(`service-${orderId}`);
                socket.emit('joinServiceRoom', order);
                logger.info(colors.magenta(`🚗 User joined service room: ${orderId}`));
            } catch (err) {
                logger.error(colors.red(`❌ joinServiceRoom error: ${err}`));
                socket.emit('error', { message: 'Failed to join service room' });
            }
        });

        // --- 3️⃣ User/Mechanic Room Join ---
        socket.on('joinUserRoom', (uid: string) => {
            socket.join(`user-${uid}`);
            socket.emit('joinUserRoom', uid);
            logger.info(colors.gray(`👤 Joined user room: ${uid}`));
        });

        socket.on('joinMechanicRoom', (mid: string) => {
            socket.join(`mechanic-${mid}`);
            logger.info(colors.gray(`🔧 Joined mechanic room: ${mid}`));
        });

        // --- 4️⃣ Location Updates ---
        socket.on('updateLocation', async (data) => {
            try {
                const { orderId, userType, userId, longitude, latitude } = data;
                let result;

                if (userType === 'mechanic') {
                    result = await updateMechanicLocationIntoDB(orderId, userId, longitude, latitude);
                } else {
                    result = await updateUserLocationIntoDB(orderId, userId, longitude, latitude);
                }

                socket.emit('updateLocation', result);
                logger.info(colors.blue(`📍 Location updated for ${userType} ${userId}`));
            } catch (err) {
                logger.error(colors.red(`❌ Failed to update location: ${err}`));
                socket.emit('error', { message: 'Failed to update location' });
            }
        });

        // --- 5️⃣ Handle Disconnect ---
        socket.on('disconnect', () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                logger.info(colors.yellow(`🔌 User ${socket.userId} disconnected`));
            }
        });
    });

    logger.info(colors.green('✅ Socket.IO initialized successfully'));
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
