import { getDevices, getChatLogs } from '../services/firebase.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEXT_LOG_FILE = process.env.VERCEL ? path.join('/tmp', 'data/chat-log.txt') : path.resolve(__dirname, '../../data/chat-log.txt');

export async function getDashboardStats(req, res, next) {
  try {
    const devices = await getDevices();
    const logs = await getChatLogs({ limit: 1000 });

    const totalDevices = devices.length;
    const totalMessages = logs.length;

    res.json({
      success: true,
      stats: {
        totalDevices,
        totalMessages
      },
      devices
    });
  } catch (err) {
    next(err);
  }
}

export async function getRecentLogs(req, res, next) {
  try {
    const { deviceId, limit = 50 } = req.query;
    const logs = await getChatLogs({
      deviceId: deviceId || undefined,
      limit: parseInt(limit, 10) || 50
    });

    res.json({
      success: true,
      logs
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadTextLog(req, res, next) {
  try {
    let content = 'Belum ada log aktivitas.';
    try {
      content = await fs.readFile(TEXT_LOG_FILE, 'utf-8');
    } catch {}

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="chat-log.txt"');
    res.send(content);
  } catch (err) {
    next(err);
  }
}
