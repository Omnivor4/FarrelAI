import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.resolve(__dirname, '../../data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const TEXT_LOG_FILE = path.join(DATA_DIR, 'chat-log.txt');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson(filePath, defaultValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

async function writeJson(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function appendTextLog({ deviceId, platform, userMessage, botReply, timestamp }) {
  await ensureDataDir();
  const dateStr = new Date(timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const entry = `[${dateStr}] [Perangkat: ${platform || 'Unknown'} | ID: ${deviceId}]
User: "${userMessage}"
Bot : "${botReply}"
${'-'.repeat(60)}\n\n`;

  await fs.appendFile(TEXT_LOG_FILE, entry, 'utf-8');
}

export async function localLogInteraction({ deviceId, platform, userMessage, botReply }) {
  await ensureDataDir();
  const timestamp = new Date().toISOString();

  const devices = await readJson(DEVICES_FILE, []);
  const existingDevice = devices.find(d => d.deviceId === deviceId);

  if (existingDevice) {
    existingDevice.lastActive = timestamp;
    existingDevice.platform = platform || existingDevice.platform;
    existingDevice.messageCount = (existingDevice.messageCount || 0) + 1;
  } else {
    devices.unshift({
      deviceId,
      platform: platform || 'Web Browser',
      firstSeen: timestamp,
      lastActive: timestamp,
      messageCount: 1
    });
  }
  await writeJson(DEVICES_FILE, devices);

  const chats = await readJson(CHATS_FILE, []);
  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    deviceId,
    platform: platform || 'Web Browser',
    userMessage,
    botReply,
    timestamp
  };
  chats.unshift(newChat);
  if (chats.length > 1000) chats.length = 1000;
  await writeJson(CHATS_FILE, chats);

  await appendTextLog({ deviceId, platform, userMessage, botReply, timestamp });

  return newChat;
}

export async function localGetDevices() {
  return await readJson(DEVICES_FILE, []);
}

export async function localGetChatLogs({ deviceId, limit = 50 } = {}) {
  const chats = await readJson(CHATS_FILE, []);
  if (deviceId) {
    return chats.filter(c => c.deviceId === deviceId).slice(0, limit);
  }
  return chats.slice(0, limit);
}
