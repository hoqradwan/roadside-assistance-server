import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { IUser, IPendingUser } from "./user.interface";

import { OTPModel, PendingUserModel, UserModel } from "./user.model";
import {
  JWT_SECRET_KEY,
  Nodemailer_GMAIL,
  Nodemailer_GMAIL_PASSWORD,
} from "../../config";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import mongoose from "mongoose";
import Mechanic from "../Mechanic/mechanic.model";

export const createUser = async ({
  name,
  email,
  role,
  hashedPassword,
}: {
  name: string;
  email: string;
  role: string;
  hashedPassword: string;
}): Promise<{ createdUser: IUser }> => {
  const createdUser = await UserModel.create({
    name,
    email,
    role,
    password: hashedPassword,
  });
  return { createdUser };
};

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return UserModel.findOne({ email });
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  return UserModel.findById(id);
};

export const updateUserById = async (
  id: string,
  updateData: Partial<IUser>,
): Promise<IUser | null> => {
  return UserModel.findByIdAndUpdate(id, updateData, { new: true });
};

export const getUserList = async (
  adminId: string,
  skip: number,
  limit: number,
  date?: string,
  name?: string,
  email?: string,
): Promise<{ users: IUser[]; totalUsers: number; totalPages: number }> => {
  //const query: any = { isDeleted: { $ne: true } }
  //const query: any = { _id: { $ne: adminId } };

  const query: any = {
    $and: [{ isDeleted: { $ne: true } }, { _id: { $ne: adminId } }, { role: { $ne: "mechanic" } }],
  };



  if (name) {
    query.name = { $regex: name, $options: "i" };
  }

  if (email) {
    query.email = { $regex: email, $options: "i" };
  }

  const users = await UserModel.find(query)
    .select("name email uniqueUserId createdAt role phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalUsers = await UserModel.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  return { users, totalUsers, totalPages };
};
export const getMechanicList = async (
  adminId: string,
  skip: number,
  limit: number,
  date?: string,
  name?: string,
  email?: string,
): Promise<{ users: IUser[]; totalUsers: number; totalPages: number }> => {
  //const query: any = { isDeleted: { $ne: true } }
  //const query: any = { _id: { $ne: adminId } };

  const query: any = {
    $and: [{ isDeleted: { $ne: true } }, { _id: { $ne: adminId } }, { role: { $ne: "user" } }],
  };



  if (name) {
    query.name = { $regex: name, $options: "i" };
  }

  if (email) {
    query.email = { $regex: email, $options: "i" };
  }

  const users = await UserModel.find(query)
    .select("name email uniqueUserId createdAt role phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalUsers = await UserModel.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limit);

  return { users, totalUsers, totalPages };
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const saveOTP = async (email: string, otp: string): Promise<void> => {
  await OTPModel.findOneAndUpdate(
    { email },
    { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    { upsert: true, new: true },
  );
};

export const getStoredOTP = async (email: string): Promise<string | null> => {
  const otpRecord = await OTPModel.findOne({ email });
  return otpRecord ? otpRecord.otp : null;
};

export const getUserRegistrationDetails = async (
  email: string,
): Promise<IPendingUser | null> => {
  return PendingUserModel.findOne({ email });
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, JWT_SECRET_KEY as string, { expiresIn: "7d" });
};

export const sendOTPEmail = async (
  email: string,
  otp: string,
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: Nodemailer_GMAIL,
      pass: Nodemailer_GMAIL_PASSWORD,
    },
  });

  // English and Spanish email content based on the lang parameter
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0f0f0; padding: 20px;">
      <h1 style="text-align: center; color: #452778; font-family: 'Times New Roman', Times, serif;">
        Like<span style="color:black; font-size: 0.9em;">Mine</span>
      </h1>
      <div style="background-color: white; padding: 20px; border-radius: 5px;">
        <h2 style="color:#d3b06c">Hello!</h2>
        <p>You are receiving this email because we received a registration request for your account.</p>
        <div style="text-align: center; margin: 20px 0;">
          <h3>Your OTP is: <strong>${otp}</strong></h3>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, no further action is required.</p>
        <p>Regards,<br>LikeMine</p>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">If you're having trouble copying the OTP, please try again.</p>
    </div>
  `;

  const mailOptions = {
    from: "khansourav58@gmail.com",
    to: email,
    subject: "Registration OTP",
    html: emailContent,
  };

  await transporter.sendMail(mailOptions);
};

export const verifyPassword = async (
  inputPassword: string,
  storedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(inputPassword, storedPassword);
};

export const changeUserRole = async (
  userId: string,
  newRole: "admin" | "user",
): Promise<IUser | null> => {
  return UserModel.findByIdAndUpdate(userId, { role: newRole }, { new: true });
};

export const userDelete = async (id: string): Promise<void> => {
  await UserModel.findByIdAndUpdate(id, { isDeleted: true });
};

const AVERAGE_SPEED_KMPH = 30; // Adjust based on your use case

export const getDistanceAndETA = async (userId: string, mechanicId: string) => {
  const user = await UserModel.findById(userId);
  // if (!user || !user.location || !user.location.lat || !user.location.lng) {
  //   throw new AppError(httpStatus.BAD_REQUEST, "User or location not found");
  // }

  // Find the mechanic user
  const mechanicUser = await UserModel.findById(mechanicId);


  // if (
  //   !mechanicUser ||
  //   !mechanicUser.location ||
  //   !mechanicUser.location.lat ||
  //   !mechanicUser.location.lng
  // ) {
  //   throw new AppError(httpStatus.BAD_REQUEST, "Mechanic or location not found");
  // }

  // GeoNear needs coordinates in GeoJSON format
  const geoNearResult = await UserModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [user?.location.coordinates[0], user?.location.coordinates[1]],
        },
        key: "location", // your user schema should have index on `location`
        query: { _id: new mongoose.Types.ObjectId(mechanicUser._id) },
        distanceField: "distanceInMeters",
        spherical: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        distanceInKm: { $divide: ["$distanceInMeters", 1000] },
      },
    },
    {
      $addFields: {
        estimatedTimeInMinutes: {
          $ceil: {
            $divide: [
              { $multiply: ["$distanceInKm", 60] },
              AVERAGE_SPEED_KMPH,
            ],
          },
        },
      },
    },
  ]);

  if (!geoNearResult.length) {
    throw new AppError(httpStatus.NOT_FOUND, "Mechanic not found nearby");
  }

  const result = geoNearResult[0];

  return {
    mechanicId: result._id,
    mechanicName: result.name,
    distance: `${result.distanceInKm.toFixed(2)} km`,
    eta: `${result.estimatedTimeInMinutes} mins`,
  };
};

export const updateProfileIntoDB = async (
  userId: string,
  formattedData: any,
  image: any,
) => {
  // Find the user by their ID
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Prepare the update object
  const updateData: any = {
    name: formattedData.name || user.name,
    phone: formattedData.phone || user.phone,
    bio: formattedData.bio || user.bio,
    experience: formattedData.experience || user.experience,
  };

  // Only update profileImage if it's provided
  if (image) {
    updateData.image = image;
  }



  // Update the user in the database
  const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, { new: true });

  return updatedUser;
};

//   const user = await UserModel.findById(userId);
//   const mechanicData = await Mechanic.findById(mechanicId).populate("user");

//   if (!user || !mechanicData || !mechanicData.user) {
//     throw new Error("User or Mechanic not found");
//   }

//   const mechanicUser = mechanicData.user as any;

//   if (!user.location || !mechanicUser.location) {
//     throw new Error("Missing location data");
//   }

//   const origin = user.location;
//   const destination = mechanicUser.location;
//   const { distanceText, durationText } = await getDistanceFromGoogleMaps(origin, destination);

//   return {
//     from: user.name,
//     to: mechanicUser.name,
//     distance: distanceText,
//     duration: durationText,
//   };
// };