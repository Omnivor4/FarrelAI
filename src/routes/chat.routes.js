import { Router } from 'express';
import { handleChatMessage } from '../controllers/chat.controller.js';
import { chatRateLimit } from '../middlewares/security.middleware.js';

const router = Router();

router.post('/', chatRateLimit, handleChatMessage);

export default router;
