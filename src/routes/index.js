import { Router } from 'express';
import chatRoutes from './chat.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/farrelai', adminRoutes);

export default router;
