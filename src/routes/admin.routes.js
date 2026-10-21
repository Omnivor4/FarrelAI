import { Router } from 'express';
import { adminAuth } from '../middlewares/auth.middleware.js';
import {
  getDashboardStats,
  getRecentLogs,
  downloadTextLog
} from '../controllers/admin.controller.js';

const router = Router();

router.use(adminAuth);

router.get('/stats', getDashboardStats);
router.get('/logs', getRecentLogs);
router.get('/export', downloadTextLog);

export default router;
