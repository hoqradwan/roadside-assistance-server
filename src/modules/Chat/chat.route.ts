import express from 'express';
import { getChatHistory, sendMessage } from './chat.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = express.Router();

// Get chat history between two users
router.get('/:receiver',adminMiddleware("admin","user","mechanic"), getChatHistory);

// Send a message between two users
router.post('/send',adminMiddleware("user","mechanic"), sendMessage);

export const ChatRoutes = router;
