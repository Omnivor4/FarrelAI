import { generateReply } from '../services/gemini.service.js';
import { logInteraction } from '../services/firebase.service.js';

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

    const cleanDeviceId = deviceId?.trim() || 'anon-device';
    const cleanPlatform = platform?.trim() || 'Unknown Browser';
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

    const botReply = await generateReply(cleanMessage, safeHistory);

    logInteraction({
      deviceId: cleanDeviceId,
      platform: cleanPlatform,
      userMessage: cleanMessage,
      botReply
    }).catch(err => {
      console.warn('[Logger Background Error]', err.message);
    });

    return res.json({
      success: true,
      reply: botReply
    });
  } catch (err) {
    if (/quota|exhausted|rate limit|too many requests|tokens|429/i.test(err.message)) {
      const fallbackMsg = 'yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset';
      return res.json({
        success: true,
        reply: fallbackMsg
      });
    }
    next(err);
  }
}
