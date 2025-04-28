import jwt from 'jsonwebtoken';

export const getUserData = (token: string) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { id: string };
        return decoded;
    } catch (error) {
        console.error("Invalid token:", error);
        return null; 
    }
}