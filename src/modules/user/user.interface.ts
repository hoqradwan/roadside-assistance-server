import { Document } from "mongoose";

export type IPendingUser = {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  role: "user" | "admin" | "mechanic";
} & Document;

export type IUser = {
  name?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  address?: string;
 image?: string;
  role: "admin" | "user" | "mechanic";
  status: "active" | "blocked";
  age: string;
  gender: string;
  about: string;
  bio: string;
  cuponCode: string;
  serviceRadius : number;
  location :{
    
    type : string;
    coordinates : [number,number];
  },
  isActive : boolean;
  expiryDate: Date | null;
  activeDate: Date | null;
  isDeleted: boolean;
  uniqueUserId: string;
  
} & Document;

export type IOTP = {
  email: string;
  otp: string;
  expiresAt: Date;
} & Document;
