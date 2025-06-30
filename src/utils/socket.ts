// const { createLogger } = require("winston");
// const logger = require("../helpers/logger");
// const chatModel = require("../modules/Chat/chat.model");
// const { getMyChatList } = require("../modules/Chat/chat.service");
// const messageModel = require("../modules/Message/message.model");
// const User = require("../modules/User/user.model");
// const { chatService } = require("../modules/Chat/chat.service");
// const socketAuthMiddleware = require("./auth/auth");
// const { cpuCount } = require("os-utils");
// const httpStatus = require("http-status");
// const {
//   addNotification,
// } = require("../modules/Notification/notification.service");

// async function getChatById(chatId) {
//   try {
//     const chat = await chatModel.findById(chatId).populate("loadId");
//     console.log({ chat });
//     if (!chat) {
//       throw new Error(`Chat with ID ${chatId} not found`);
//     }
//     return chat;
//   } catch (error) {
//     console.error("Error fetching chat:", error);
//     throw error; // Rethrow to handle it in the calling function
//   }
// }

// // const userLiveLocationShare = require("./features/userLiveLocationShare");

// const drivers = {}; // Example storage for driver locations
// const products = {}; // Example storage for product destinations

// const collectLocation = [];

// const socketIO = (io) => {
//   //initialize an object to store the active users
//   let activeUsers = {};
//   io.use(socketAuthMiddleware);
//   let onlineUsers = [];

//   try {
//     io.on("connection", (socket) => {
//       //add the user to the active users list
//       try {
//         if (!activeUsers[socket?.decodedToken?._id]) {
//           activeUsers[socket?.decodedToken?._id] = {
//             ...socket?.decodedToken,
//             id: socket?.decodedToken?._id,
//           };
//           console.log(
//             `User Id: ${socket?.decodedToken?._id} is just connected.`
//           );
//         } else {
//           console.log(
//             `User Id: ${socket?.decodedToken?._id} is already connected.`
//           );
//         }
//       } catch (error) {
//         console.error("Error fetching user data:", error);
//         logger.error(error, "-- socket.io connection error --");
//       }

//       const user = socket.decodedToken;

//       try {
//         socket.on("join", (data) => {
//           const chatId = data.toString();
//           socket.join(chatId);

//           const userId = user._id.toString();

//           if (!onlineUsers.includes(userId)) {
//             onlineUsers.push(userId);
//           }
//           io.emit("online-users-updated", onlineUsers);
//         });

//         socket.on("send-new-message", async (message, callback) => {
//           console.log("new message ====>", { message });

//           try {
//             console.log("chat -> ", message.chat);
//             // Assuming `getChatById` fetches the chat object including the users array
//             const chat = await getChatById(message.chat);

//             console.log({ chat });

//             let newMessage;
//             let userData;
//             if (chat) {
//               newMessage = await messageModel.create(message);
//               // console.log("==== new Message ==== " ,{ newMessage });
//               // console.log("==== chat Message ==== " ,{ chat });

//               let receiverId;
//               if (chat.chatType === "shipper-receiver") {
//                 console.log("==== user ===", user);
//                 console.log("==== receiver ===",chat.loadId.receiverId);

//                 if(user._id === chat.loadId.receiverId.toString()){
//                   console.log('asdflkjaskldfjkasjfdkjdsfkj')
//                   receiverId = chat.loadId.user;
//                 }
//                 else{
//                   receiverId = chat.loadId.receiverId; // Assuming loadId has receiverId
//                 }

//               } else if (chat.chatType === "shipper-driver") {
//                 if(user._id === chat.loadId.driver.toString()){
//                   receiverId = chat.loadId.user;
//                 }
//                 else{
//                   receiverId = chat.loadId.driver; // Assuming loadId has driver
//                 }

//               } else if (chat.chatType === "driver-receiver") {
//                 if(user._id === chat.loadId.receiverId.toString()){
//                   receiverId = chat.loadId.driver;
//                 }
//                 else{
//                   receiverId = chat.loadId.receiverId; // Assuming loadId has driver
//                 }
//               }
//               // Emit notification to the receiver
//               if (receiverId) {
//                 const onlineUser = onlineUsers.find((id) => id === receiverId?.toString());
//                 console.log("==== online User ==== ", onlineUser);
//                 if (!onlineUser) {
//                   const notificationData = {
//                     message: "You have got a new message",
//                     type: "message",
//                     role: socket.decodedToken.role,
//                     linkId: newMessage._id,
//                     sender: user._id,
//                     receiver: receiverId,
//                   };
//                   await addNotification(notificationData);
//                 }
//               }
//             }
//             // console.log(message?.chat);
//             const chatId = message?.chat;
//             socket
//               .to(chatId)
//               .emit(`new-message-received::${message?.chat}`, message);
//             // io.to(chatId).emit(`new-message-received::${message?.chat}`, message);
//             socket.emit(`new-message-received::${message?.chat}`, message);

//             callback({ success: true, message: newMessage, result: message });
//           } catch (error) {
//             console.error("Error fetching chat details:", error);
//           }
//         });

//         // typing functionality start

//         socket.on("typing", async (message, callback) => {

//           if (message.status === "true") {
//             io.emit(`typing::${message.receiverId}`, true);
//             callback({ success: true, message: message, result: message });
//           } else {
//             io.emit(`typing::${message.receiverId}`, false);
//             callback({ success: false, message: message, result: message });
//           }
//         });

//         // typing functionality end

//         const locationBuffer = [];
//         const LOCATION_LIMIT = 30;
//         let lastUpdateTime = Date.now();

//         socket.on("client_location", async (data, callback) => {
//           const longitude = Number(data.lang);
//           const latitude = Number(data.lat);

//           // console.log(locationBuffer, "from socket")
//           locationBuffer.push({ longitude, latitude });

//           if (locationBuffer.length >= LOCATION_LIMIT) {
//             const currentTime = Date.now();
//             const timeElapsed = currentTime - lastUpdateTime;
//             if (timeElapsed >= 30 * 1000) {
//               try {
//                 const lastLocation = locationBuffer[LOCATION_LIMIT - 1];
//                 await User.findByIdAndUpdate(
//                   user?._id,
//                   { $set: { "location.coordinates": [longitude, latitude] } },
//                   { new: true }
//                 );

//                 // const lastLocation = locationBuffer[LOCATION_LIMIT - 1];

//                 // console.log({"location.coordinates": lastLocation})
//                 // await User.findByIdAndUpdate(
//                 //   user?._id,
//                 //   { $set: { "location.coordinates": lastLocation } },
//                 //   { new: true }
//                 // );

//                 console.log("Database updated with location:", lastLocation);
//                 locationBuffer.length = 0;
//                 lastUpdateTime = Date.now();
//               } catch (error) {
//                 console.error("Error updating the database:", error.message);
//               }
//             } else {
//               console.log(
//                 `Waiting for 1 minute. Time remaining: ${
//                   30 - Math.floor(timeElapsed / 1000)
//                 } seconds`
//               );
//             }
//           }
//           // io.emit(`server_location::${user?._id?.toString()}`, data);
//           io.emit(`server_location`, data);
//         });

//         // Leave a chat room start
//         socket.on("leave", (chatId) => {
//           console.log(`${socket.id} left room ${chatId}`);
//           socket.leave(chatId);

//           // Remove user from onlineUsers
//           const userId = socket?.decodedToken?._id?.toString();
//           if (userId) {
//             onlineUsers = onlineUsers.filter((id) => id !== userId);
//             io.emit("online-users-updated", onlineUsers); // Notify all clients about the change
//             console.log(`User ID: ${userId} removed from onlineUsers.`);
//           }
//         });

//       } catch (error) {}

//       socket.on("check", (data, callback) => {
//         console.log("check event of socket in backend -> ", { data });
//         callback({ success: true });
//       });

//       socket.on("disconnect", () => {
//         delete activeUsers[socket?.decodedToken?._id];
//         console.log(`User ID: ${socket?.decodedToken?._id} just disconnected`);
//       });
//     });
//   } catch (error) {}
// };

// module.exports = socketIO;

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

    // console.log('Socket connected token :', socket.handshake.headers.token);
    const token = socket.handshake.headers.token || socket.handshake.headers.authorization;

    if (!token) {
      logger.error(colors.red('No token provided'));
      socket.emit('error', 'Unauthorized');
      socket.disconnect();
      return;
    }

    userData = getUserData(token as string);

    console.log({ userData })

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


        console.log({ onlineUsers });
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