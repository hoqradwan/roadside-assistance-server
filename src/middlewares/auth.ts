import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend the Express Request type to include the user property
interface AuthRequest extends Request {
  user?: jwt.JwtPayload | string;
}

type Role = "admin" | "user";

export const adminMiddleware = (role?: Role) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);

      req.user = decoded; // Attach user data to request object

      // Check if the user is admin
      if (role && (req.user as jwt.JwtPayload)?.role === "admin") {
        return next();
      }
      // Check if the user has the required role
      if (role && (req.user as jwt.JwtPayload).role !== role) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized",
        });
      }
      next();
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid token!" });
    }
  };
};
