import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

type Role = "user" | "admin" | "mechanic"; // Add more roles as needed
interface AuthRequest extends Request {
  user?: jwt.JwtPayload | string;
}

export const adminMiddleware = (...roles: Role[]) => {
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
      // Check if the user has one of the required roles
      if (roles.length > 0 && !roles.includes((req.user as jwt.JwtPayload)?.role)) {
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

