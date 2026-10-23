import { generateReply } from '../services/gemini.service.js';
import { logInteraction } from '../services/firebase.service.js';

export function validateAndSanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  const safe = [];
  const injectionPattern = /system\s*prompt|instruksi\s*(awal|sistem)|prompt\s*(awal|rahasia)|konfigurasi\s*(sistem|ai|bot)|tanpa\s*batasan|unrestricted|ignore\s*(all|previous)|bypass|developer\s*mode|jailbreak|act\s*as\s*dan/i;

  for (const item of history.slice(-6)) {
    if (!item || typeof item !== 'object') continue;

    let role = item.role;
    if (role === 'assistant') role = 'model';
    if (role !== 'user' && role !== 'model') continue;

    const rawText = typeof item.text === 'string' ? item.text : (typeof item.content === 'string' ? item.content : '');
    const cleanText = rawText.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
    if (!cleanText || cleanText.length > 300) continue;

    if (role === 'model' && injectionPattern.test(cleanText)) {
      continue;
    }

    if (safe.length > 0 && safe[safe.length - 1].role === role) {
      continue;
    }

    safe.push({ role, text: cleanText });
  }

  return safe;
}

export function sanitizeDeviceId(deviceId) {
  if (typeof deviceId !== 'string') return 'anon-device';
  const trimmed = deviceId.trim();
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(trimmed)) {
    return trimmed;
  }
  return 'anon-device';
}

export function sanitizePlatform(platform) {
  if (typeof platform !== 'string') return 'Web Browser';
  const cleaned = platform.replace(/[^\w\s()./,-]/g, '').trim();
  return cleaned.slice(0, 80) || 'Web Browser';
}

export async function handleChatMessage(req, res, next) {
  try {
    const { message, history = [], deviceId, platform } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pesan tidak boleh kosong.'
      });
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Pesan terlalu panjang (maksimal 500 karakter).'
      });
    }

    const cleanDeviceId = sanitizeDeviceId(deviceId);
    const cleanPlatform = sanitizePlatform(platform);
    const safeHistory = validateAndSanitizeHistory(history);

    const botReply = await generateReply(cleanMessage, safeHistory);

    if (botReply === 'Yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset') {
      return res.status(429).json({
        success: false,
        quotaExhausted: true,
        error: 'Yailah token e habis, tunggu besok ya atau nanti malem sapa tau ws reset.'
      });
    }

    try {
      await logInteraction({
        deviceId: cleanDeviceId,
        platform: cleanPlatform,
        userMessage: cleanMessage,
        botReply
      });
    } catch (err) {
      console.warn('[Logger Error]', err.message);
    }

    return res.json({
      success: true,
      reply: botReply
    });
  } catch (err) {
    if (/quota|exhausted|rate limit|too many requests|tokens|429/i.test(err.message)) {
      return res.status(429).json({
        success: false,
        quotaExhausted: true,
        error: 'Yailah token e habis, tunggu besok ya atau nanti malem sapa tau ws reset.'
      });
    }
    next(err);
  }
}
