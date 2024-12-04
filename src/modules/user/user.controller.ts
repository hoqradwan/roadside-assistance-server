import { Request, Response } from "express";
import bcrypt from "bcrypt";

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";
import {
  createUser,
  findUserByEmail,
  findUserById,
  generateOTP,
  generateToken,
  getStoredOTP,
  getUserList,
  getUserRegistrationDetails,
  hashPassword,
  saveOTP,
  sendOTPEmail,
  updateUserById,
  userDelete,
} from "./user.service";

import { OTPModel, PendingUserModel, UserModel } from "./user.model";

import { validateUserInput } from "./user.validation";
import { IPendingUser } from "./user.interface";
import {
  JWT_SECRET_KEY,
  Nodemailer_GMAIL,
  Nodemailer_GMAIL_PASSWORD,
} from "../../config";
import { emitNotification } from "../../utils/socket";
import httpStatus from "http-status";

export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, confirmPassword } = req.body;

  const validationError = validateUserInput(name, email, password);
  if (validationError) {
    return sendError(res, httpStatus.BAD_REQUEST, validationError);
  }

  if (password !== confirmPassword) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Passwords do not match",
    });
  }

  const isUserRegistered = await findUserByEmail(email);
  if (isUserRegistered) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "You already have an account.",
    });
  }

  await PendingUserModel.findOneAndUpdate(
    { email },
    {
      name,
      email,
      password,
      confirmPassword,
    },
    { upsert: true },
  );

  const otp = generateOTP();
  await saveOTP(email, otp);

  await sendOTPEmail(email, otp);

  const token = jwt.sign({ email }, JWT_SECRET_KEY as string, {
    expiresIn: "7d",
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email. Please verify to continue registration.",
    data: { token },
  });
});

export const resendOTP = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
    email: string;
  };
  const email = decoded.email;

  if (!email) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Please provide a valid email address.",
    });
  }

  const pendingUser = await PendingUserModel.findOne({ email });
  if (!pendingUser) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "No pending registration found for this email.",
    });
  }

  const newOTP = generateOTP();

  await saveOTP(email, newOTP);

  await sendOTPEmail(email, newOTP);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "A new OTP has been sent to your email.",
    data: { token },
  });
});

export const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);

  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "This account does not exist.",
    });
  }
  if (user.isDeleted) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "your account is deleted by admin.",
    });
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordValid) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "Wrong password!",
    });
  }

  const token = generateToken({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user?.image,
    age: user?.age,
    gender: user?.gender,
    bio: user?.bio,
    about: user?.about,
    address: user?.address,
    phone: user?.phone,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login complete!",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user?.image,
        age: user?.age,
        gender: user?.gender,
        bio: user?.bio,
        about: user?.about,
        address: user?.address,
        phone: user?.phone,
      },
      token,
    },
  });
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Please provide an email.",
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "This account does not exist.",
      });
    }

    const otp = generateOTP();

    await saveOTP(email, otp);

    const token = jwt.sign({ email }, JWT_SECRET_KEY as string, {
      expiresIn: "7d",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      auth: {
        user: Nodemailer_GMAIL,
        pass: Nodemailer_GMAIL_PASSWORD,
      },
    });

    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0f0f0; padding: 20px;">
      <h1 style="text-align: center; color: #452778; font-family: 'Times New Roman', Times, serif;">
        Like<span style="color:black; font-size: 0.9em;">Mine</span>
      </h1>
      <div style="background-color: white; padding: 20px; border-radius: 5px;">
        <h2 style="color:#d3b06c">Hello!</h2>
        <p>You are receiving this email because we received a password reset request for your account.</p>
        <div style="text-align: center; margin: 20px 0;">
          <h3>Your OTP is: <strong>${otp}</strong></h3>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request a password reset, no further action is required.</p>
        <p>Regards,<br>LikeMine</p>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">If you're having trouble copying the OTP, please try again.</p>
    </div>
  `;

    const receiver = {
      from: "khansourav58@gmail.com",
      to: email,
      subject: "Reset Password OTP",
      html: emailContent,
    };

    await transporter.sendMail(receiver);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "OTP sent to your email. Please check!",
      data: {
        token: token,
      },
    });
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
 
const email = req.query.email as string;

  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Please provide both password and confirmPassword.",
    });
  }

  if (password !== confirmPassword) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Passwords do not match.",
    });
  }


  const user = await findUserByEmail(email);

  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "User not found.",
    });
  }

  const newPassword = await hashPassword(password);
  user.password = newPassword;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully.",
    data: null,
  });
});

export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const { otp } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
    email: string;
  };
  const email = decoded.email;

  const storedOTP = await getStoredOTP(email);

  if (!storedOTP || storedOTP !== otp) {
    return sendError(res, httpStatus.BAD_REQUEST, {
      message: "Invalid or expired OTP",
    });
  }

  const { name, password } = (await getUserRegistrationDetails(
    email,
  )) as IPendingUser;
  //console.log(objective, "objective from controller");
  const hashedPassword = await hashPassword(password);

  const { createdUser } = await createUser({
    name,
    email,
    hashedPassword,
  });

  const userMsg = "Welcome to LikeMine_App.";
  const adminMsg = `${name} has successfully registered.`;

  await emitNotification({
    userId: createdUser._id as string,
    userMsg,
    adminMsg,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registration successful.",
    data: null,
  });
});

export const verifyForgotPasswordOTP = catchAsync(
  async (req: Request, res: Response) => {
    const { otp } = req.body;
    const email = req.query.email as string;

    const otpRecord = await OTPModel.findOne({ email });

    if (!otpRecord) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "User not found!",
      });
    }

    const currentTime = new Date();
    if (otpRecord.expiresAt < currentTime) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "OTP has expired",
      });
    }

    if (otpRecord.otp !== otp) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Wrong OTP",
      });
    }

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "OTP verified successfully.",
      data: null,
    });
  },
);

export const changePassword = catchAsync(
  async (req: Request, res: Response) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, httpStatus.UNAUTHORIZED, {
        message: "No token provided or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!oldPassword || !newPassword || !confirmPassword) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message:
          "Please provide old password, new password, and confirm password.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
      email: string;
    };
    const email = decoded.email;

    const user = await findUserByEmail(email);
    if (!user) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password as string);
    if (!isMatch) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "Old password is incorrect.",
      });
    }

    if (newPassword !== confirmPassword) {
      return sendError(res, httpStatus.BAD_REQUEST, {
        message: "New password and confirm password do not match.",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    await user.save();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "You have successfully changed the password.",
      data: null,
    });
  },
);

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { name, address, bio, phone, age, about, gender } = req.body;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as { id: string };

  const userId = decoded.id;

  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "User not found.",
    });
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (address) updateData.address = address;
  if (bio) updateData.bio = bio;
  if (age) updateData.age = age;
  if (about) updateData.about = about;
  if (gender) updateData.gender = gender;
  if (req.file) {
    const imagePath = `public\\images\\${req.file.filename}`;
    const publicFileURL = `/images/${req.file.filename}`;

    updateData.image = {
      path: imagePath,
      publicFileURL: publicFileURL,
    };
  }

  const updatedUser = await updateUserById(userId, updateData);

  if (updatedUser) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile updated.",
      data: updatedUser,
      pagination: undefined,
    });
  }
});

export const getSelfInfo = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as { id: string };
  const userId = decoded.id;

  const user = await findUserById(userId);
  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "User not found.",
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "profile information retrieved successfully",
    data: user,
    pagination: undefined,
  });
});

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }
  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as { id: string };
  const adminId = decoded.id;

  // Find the user by userId
  const user = await findUserById(adminId);
  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "This admin account doesnot exist.",
    });
  }
  // Check if the user is an admin
  if (user.role !== "admin") {
    return sendError(res, httpStatus.FORBIDDEN, {
      message: "Only admins can access the user list.",
    });
  }
  // Pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Optional filters
  const date = req.query.date as string;
  const name = req.query.name as string;
  const email = req.query.email as string;

  // Get users with pagination
  const { users, totalUsers, totalPages } = await getUserList(
    adminId,
    skip,
    limit,
    date,
    name,
    email,
  );
  // Pagination logic for prevPage and nextPage
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  // Send response with pagination details
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User list retrieved successfully",
    data: users,
    pagination: {
      totalPage: totalPages,
      currentPage: page,
      prevPage: prevPage ?? 1,
      nextPage: nextPage ?? 1,
      limit,
      totalItem: totalUsers,
    },
  });
});

export const BlockUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, httpStatus.UNAUTHORIZED, {
      message: "No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET_KEY as string) as {
    id: string;
  };
  const adminId = decoded.id;

  const requestingUser = await UserModel.findById(adminId);

  if (!requestingUser || requestingUser.role !== "admin") {
    return sendError(res, httpStatus.FORBIDDEN, {
      message: "Unauthorized: Only admins can change user status.",
    });
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "User not found.",
    });
  }

  if (user.role === "admin") {
    return sendError(res, httpStatus.FORBIDDEN, {
      message: "Cannot change status of an admin user.",
    });
  }

  // Toggle the status
  user.status = user.status === "active" ? "blocked" : "active";
  await user.save();

  const userMsg =
    user.status === "blocked"
      ? "Your account has been blocked by an admin."
      : "Your account has been unblocked by an admin.";

  // Uncomment this when you're ready to use the notification function
  // await emitNotificationForChangeUserRole({
  //   userId,
  //   userMsg,
  // });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status changed to ${user.status} successfully.`,
    data: null,
    pagination: undefined,
  });
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const id = req.query?.id as string;

  const user = await findUserById(id);

  if (!user) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "user not found .",
    });
  }

  if (user.isDeleted) {
    return sendError(res, httpStatus.NOT_FOUND, {
      message: "user  is already deleted.",
    });
  }
  await userDelete(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "user deleted successfully",
    data: null,
  });
});


//admin-login
export const adminloginUser = catchAsync(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    // const lang = req.headers.lang as string;

    // // Check language validity
    // if (!lang || (lang !== "es" && lang !== "en")) {
    //   return sendError(res, httpStatus.BAD_REQUEST, {
    //     message: "Choose a language",
    //   });
    // }

    const user = await findUserByEmail(email);
    if (!user) {
      return sendError(res, httpStatus.NOT_FOUND, {
        message:
          // lang === "es"
          //   ? "Esta cuenta no existe."
          //   :
          "This account does not exist.",
      });
    }

    // check admin or not
    //  console.log(user,"user")
    if (user.role !== "admin") {
      return sendError(res, httpStatus.FORBIDDEN, {
        message:
          // lang === "es"
          //   ? "Solo los administradores pueden iniciar sesión."
          //   :
          "Only admins can login.",
      });
    }

    // Check password validity
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password as string,
    );
    if (!isPasswordValid) {
      return sendError(res, httpStatus.UNAUTHORIZED, {
        message:
          // lang === "es" ? "¡Contraseña incorrecta!" :
          "Wrong password!",
      });
    }

    // Generate new token for the logged-in user
    const newToken = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user?.image,
      // lang: lang,
    });

    // Send the response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        // lang === "es" ? "¡Inicio de sesión completo!" :
        "Login complete!",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user?.image,
        },
        token: newToken,
      },
    });
  },
);