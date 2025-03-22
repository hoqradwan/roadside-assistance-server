import { Router } from 'express';
import { createChatSession, getChatHistory } from './chat.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.get("/history/:userId/:otherUserId", getChatHistory);
router.post("/session", createChatSession);
  

export const ChatRoutes =  router;