import { get, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose, { ObjectId } from 'mongoose';
import { logger } from '../logger/logger';
import colors from 'colors';
import httpStatus from 'http-status';
import { ChatMessage } from '../modules/Chat/chat.model';
import { getUserData } from './getUserData';
import { on } from 'events';
import { NotificationModel } from '../modules/notifications/notification.model';
import { INotification } from '../modules/notifications/notification.interface';
import { UserModel } from '../modules/user/user.model';

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

    console.log('Socket connected token :', socket.handshake.headers.token);
    const token = socket.handshake.headers.token || socket.handshake.headers.authorization;

    if (!token) {
      logger.error(colors.red('No token provided'));
      socket.emit('error', 'Unauthorized');
      socket.disconnect();
      return;
    }
    
    userData = getUserData(token as string);

    console.log("userData", userData);

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
      socket.userId = userId ;
      onlineUsers.set(userId , socket.id);
      socket.join(userId); // Join user's personal room

      logger.info(colors.green(`User ${userId} authenticated`));
    });

    // Handle private messages
    socket.on('send-message', async ({ to, message }: { to: string; message: string }) => {

      console.log('Message received:', { to, message });
      console.log(socket.handshake)
      if (!socket.userId) {
        socket.emit('error', 'Unauthorized');
        return;
      }


      try {
        // Save message to database
        const messageResult = await ChatMessage.create({
          sender: socket.userId,
          receiver: to,
          message,
          timestamp: new Date()
        });


        console.log({onlineUsers});
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
  userMsg: string;
  adminMsg: string;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }
console.log(userMsg,userId)
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




// import { logger } from '../logger/logger';
// import { UserModel } from '../modules/user/user.model';
// import colors from 'colors';
// import mongoose from 'mongoose';
// import { Socket } from 'socket.io'; // Import Socket type for better typing
// import { Server as HttpServer } from 'http';
// import { Server } from 'socket.io';

// // Extend the Socket interface to include userId
// declare module 'socket.io' {
//   interface Socket {
//     userId?: string; // Make userId optional
//   }
// }
// let io : Server | undefined; // Declare io as a Server type or undefined
// const initSocketIO = (server: HttpServer) => {
//    io = new Server(server); // Initialize Socket.IO with the server

//   io.on('connection', (socket: Socket) => {  // Add the `Socket` type to socket
//     logger.info(colors.blue('🔌🟢 A user connected'));

//     // Listen for user connection
//     socket.on('user-connected', (userId: string) => {
//       console.log('userId boomm!!!', userId);
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         logger.error(colors.red(`Invalid user ID: ${userId}`));
//         return;
//       }

//       socket.userId = userId; // Store userId on the socket
//       socket.join(userId); // Join a room corresponding to userId
//       logger.info(colors.green(`User ${userId} joined their notification room`));
//     });

//     // Handle user connection for the `user/connect` event
//     socket.on('user/connect', async ({ userId }: { userId: string }) => {  // Type the data structure
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         logger.error(colors.red(`Invalid user ID: ${userId}`));
//         return;
//       }

//       try {
//         socket.userId = userId;
//         socket.join(userId);  // Join user to their own room
//         socket.broadcast.to(userId).emit('user/inactivate', true);

//         // Update the user's online status in the database (commented out for now)
//         // await UserModel.updateOne({ _id: userId }, { $set: { isOnline: true } });

//         // Broadcast that the user has connected
//         socket.broadcast.emit('user/connect', userId);

//         logger.info(colors.green(`User ${userId} is now online.`));
//       } catch (error) {
//         logger.error(colors.red(`Error in user/connect: ${error}`));
//       }
//     });

//     // Handle user disconnect
//     const handleDisconnect = async () => {
//       if (!socket.userId || !mongoose.Types.ObjectId.isValid(socket.userId)) {
//         return;
//       }

//       try {
//         // Update user's online status to offline (commented out for now)
//         // await UserModel.updateOne(
//         //   { _id: socket.userId },
//         //   { $set: { isOnline: false } }
//         // );

//         // Broadcast that the user has disconnected
//         socket.broadcast.emit('user/disconnect', socket.userId);
//         logger.info(colors.yellow(`User ${socket.userId} is now offline.`));
//       } catch (error) {
//         logger.error(colors.red(`Error in handleDisconnect: ${error}`));
//       }
//     };

//     // Listen for the disconnect event
//     socket.on('disconnect', handleDisconnect);
//     socket.on('user/disconnect', handleDisconnect);
//   });

//   logger.info(colors.green('Socket.IO initialized'));
// };

// export { initSocketIO , io};
