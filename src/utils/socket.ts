import { logger } from '../logger/logger';
import { UserModel } from '../modules/user/user.model';
import colors from 'colors';
import mongoose from 'mongoose';
import { Socket } from 'socket.io'; // Import Socket type for better typing
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

// Extend the Socket interface to include userId
declare module 'socket.io' {
  interface Socket {
    userId?: string; // Make userId optional
  }
}
let io : Server | undefined; // Declare io as a Server type or undefined
const initSocketIO = (server: HttpServer) => {
   io = new Server(server); // Initialize Socket.IO with the server

  io.on('connection', (socket: Socket) => {  // Add the `Socket` type to socket
    logger.info(colors.blue('🔌🟢 A user connected'));

    // Listen for user connection
    socket.on('user-connected', (userId: string) => {
      console.log('userId boomm!!!', userId);
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.error(colors.red(`Invalid user ID: ${userId}`));
        return;
      }

      socket.userId = userId; // Store userId on the socket
      socket.join(userId); // Join a room corresponding to userId
      logger.info(colors.green(`User ${userId} joined their notification room`));
    });

    // Handle user connection for the `user/connect` event
    socket.on('user/connect', async ({ userId }: { userId: string }) => {  // Type the data structure
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.error(colors.red(`Invalid user ID: ${userId}`));
        return;
      }

      try {
        socket.userId = userId;
        socket.join(userId);  // Join user to their own room
        socket.broadcast.to(userId).emit('user/inactivate', true);

        // Update the user's online status in the database (commented out for now)
        // await UserModel.updateOne({ _id: userId }, { $set: { isOnline: true } });

        // Broadcast that the user has connected
        socket.broadcast.emit('user/connect', userId);

        logger.info(colors.green(`User ${userId} is now online.`));
      } catch (error) {
        logger.error(colors.red(`Error in user/connect: ${error}`));
      }
    });

    // Handle user disconnect
    const handleDisconnect = async () => {
      if (!socket.userId || !mongoose.Types.ObjectId.isValid(socket.userId)) {
        return;
      }

      try {
        // Update user's online status to offline (commented out for now)
        // await UserModel.updateOne(
        //   { _id: socket.userId },
        //   { $set: { isOnline: false } }
        // );

        // Broadcast that the user has disconnected
        socket.broadcast.emit('user/disconnect', socket.userId);
        logger.info(colors.yellow(`User ${socket.userId} is now offline.`));
      } catch (error) {
        logger.error(colors.red(`Error in handleDisconnect: ${error}`));
      }
    };

    // Listen for the disconnect event
    socket.on('disconnect', handleDisconnect);
    socket.on('user/disconnect', handleDisconnect);
  });

  logger.info(colors.green('Socket.IO initialized'));
};

export { initSocketIO , io};
