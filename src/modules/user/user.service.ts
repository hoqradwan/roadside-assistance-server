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

export const createUser = async ({
  name,
  email,
  hashedPassword,
}: {
  name: string;
  email: string;
  hashedPassword: string;
}): Promise<{ createdUser: IUser }> => {
  const createdUser = await UserModel.create({
    name,
    email,
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
    $and: [{ isDeleted: { $ne: true } }, { _id: { $ne: adminId } }],
  };

  if (date) {
    // Parse the input date (DD-MM-YYYY)
    const [day, month, year] = date.split("-").map(Number);

    // Create a Date object representing the start of the day in UTC
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    // Create a Date object representing the end of the day in UTC
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  if (name) {
    query.name = { $regex: name, $options: "i" };
  }

  if (email) {
    query.email = { $regex: email, $options: "i" };
  }

  const users = await UserModel.find(query)
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
