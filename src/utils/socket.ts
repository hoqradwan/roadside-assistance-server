import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { UserModel } from "../modules/user/user.model";
import { NotificationModel } from "../modules/notifications/notification.model";
import { INotification } from "../modules/notifications/notification.interface";

let io: SocketIOServer;

// Initialize Socket.IO
export const initSocketIO = async (server: HttpServer): Promise<void> => {
  console.log("Initializing Socket.IO server...");

  const { Server } = await import("socket.io");

  io = new Server(server, {
    // Assign the initialized io instance to the io variable
    cors: {
      origin: "*", // Replace with your client's origin
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"], // Add any custom headers if needed
      credentials: true, // If your client requires credentials
    },
  });

  console.log("Socket.IO server initialized!");

  io.on("connection", (socket: Socket) => {
    console.log("Socket just connected:", socket.id);

    // Listen for messages from the client
    socket.on("clientMessage", (message: string) => {
      console.log("Message received from client:", message);

      // Optionally, send a response back to the client
      socket.emit("serverMessage", `Server received: ${message}`);
    });

    socket.on("disconnect", () => {
      console.log(socket.id, "just disconnected");
    });
  });
};

// Emit Notification to User and Admin
// export const emitNotification = async ({
//   userId,
//   userMsg,
//   adminMsg,
// }: {
//   userId: string;
//   userMsg: ILocalizedString;
//   adminMsg: ILocalizedString;
// }): Promise<void> => {
//   if (!io) {
//     throw new Error("Socket.IO is not initialized");
//   }

//   // Get admin IDs
//   const admins = await UserModel.find({ role: "admin" }).select("_id");
//   const adminIds = admins.map((admin) => admin._id.toString());

//   // Notify the specific user
//   if (userMsg) {
//     io.emit(`notification::${userId}`, {
//       userId,
//       message: userMsg,
//     });
//   }

//   // Notify all admins
//   if (adminMsg) {
//     adminIds.forEach((adminId) => {
//       io.emit(`notification::${adminId}`, {
//         adminId,
//         message: adminMsg,
//       });
//     });
//   }

//   // Save notification to the database
//   await NotificationModel.create<INotification>({
//     userId,
//     adminId: adminIds,
//     adminMsg: adminMsg,
//     userMsg: userMsg ,
//   });
// };
export const emitNotification = async ({
  userId,
  userMsg,
  adminMsg,
}: {
  userId: string;
  userMsg: string;
  adminMsg: string;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  // Get admin IDs
  const admins = await UserModel.find({ role: "admin" }).select("_id");
  const adminIds = admins.map((admin) => admin._id.toString());

  // Notify the specific user
  if (userMsg) {
    io.emit(`notification::${userId}`, {
      userId,
      message: userMsg, // userMsg is passed as ILocalizedString (plain object)
    });
  }

  // Notify all admins
  if (adminMsg) {
    adminIds.forEach((adminId) => {
      io.emit(`notification::${adminId}`, {
        adminId,
        message: adminMsg, // adminMsg is passed as ILocalizedString (plain object)
      });
    });
  }

  // Save notification to the database
  await NotificationModel.create<INotification>({
    userId,
    adminId: adminIds,
    adminMsg: adminMsg, // Stored as ILocalizedString
    userMsg: userMsg, // Stored as ILocalizedString
  });
};

// Emit Notification for All Users
export const emitNotificationForCreateStickers = async ({
  userMsg,
}: {
  userMsg: string;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  // Get all users with role "user" (exclude admins)
  const users = await UserModel.find({ role: "user" }).select("_id");
  const userIds = users.map((user) => user._id.toString());

  // Notify all users
  if (userMsg) {
    userIds.forEach((userId) => {
      io.emit(`notification::${userId}`, {
        userId,
        message: userMsg,
      });
    });
  }

  // Save notification to the database for each user
  const notifications = userIds.map((userId) => ({
    userId,
    userMsg,
  }));

  await NotificationModel.insertMany(notifications); // Save all notifications
};

// Emit Notification for User Role Change
export const emitNotificationForChangeUserRole = async ({
  userId,
  userMsg,
}: {
  userId: string;
  userMsg: string;
}): Promise<void> => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  // Notify the specific user
  if (userMsg) {
    io.emit(`notification::${userId}`, {
      userId,
      message: userMsg,
    });
  }

  // Save the notification to the database
  await NotificationModel.create<INotification>({
    userId,
    userMsg,
  });
};
