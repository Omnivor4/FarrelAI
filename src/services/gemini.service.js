import { generateSystemInstruction } from './persona.service.js';

const FREE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash'
];
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEPRECATED_OR_PAID = [
  'gemini-4-argon',
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-3.6-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash'
];

const keyCooldowns = new Map();
const modelCooldowns = new Map();
let rotationPointer = 0;

export function resetKeyCooldowns() {
  keyCooldowns.clear();
  modelCooldowns.clear();
  rotationPointer = 0;
}

export function buildGeminiPayload(userMessage, chatHistory = [], systemPrompt = '') {
  const contents = [];

  const recentHistory = chatHistory.slice(-10);
  for (const item of recentHistory) {
    if (item.role && item.text) {
      contents.push({
        role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.text }]
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 250,
      topP: 0.95
    }
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  return payload;
}

export function getAvailableApiKeys() {
  const keys = [];
  const addKey = (val) => {
    if (!val) return;
    const parts = String(val).split(',');
    for (const part of parts) {
      const k = part.trim();
      if (k && k !== 'YOUR_GEMINI_API_KEY_HERE' && !keys.includes(k)) {
        keys.push(k);
      }
    }
  };

  addKey(process.env.GEMINI_API_KEY);
  addKey(process.env.GEMINI_API_KEY1);
  addKey(process.env.GEMINI_API_KEY2);
  addKey(process.env.GEMINI_API_KEY_2);
  addKey(process.env.GEMINI_API_KEY3);
  addKey(process.env.GEMINI_API_KEY_3);
  addKey(process.env.GEMINI_API_KEY4);
  addKey(process.env.GEMINI_API_KEY_4);
  addKey(process.env.GEMINI_API_KEY5);
  addKey(process.env.GEMINI_API_KEY_BACKUP);
  addKey(process.env.GEMINI_API_KEY_CADANGAN);

  for (const [key, val] of Object.entries(process.env)) {
    if (/gemini.*(key|backup|cadangan|\d)/i.test(key) && !/model/i.test(key)) {
      addKey(val);
    }
  }

  return keys;
}

function getRotatedKeys(keys) {
  if (!keys || keys.length <= 1) return keys || [];
  const now = Date.now();
  const healthy = [];
  const cooling = [];

  for (const k of keys) {
    const expiry = keyCooldowns.get(k) || 0;
    if (now < expiry) {
      cooling.push(k);
    } else {
      healthy.push(k);
    }
  }

  const result = [];
  if (healthy.length > 0) {
    const start = rotationPointer % healthy.length;
    rotationPointer = (rotationPointer + 1) % healthy.length;
    for (let i = 0; i < healthy.length; i++) {
      result.push(healthy[(start + i) % healthy.length]);
    }
  }

  return [...result, ...cooling];
}

export async function generateReply(userMessage, chatHistory = []) {
  const allApiKeys = getAvailableApiKeys();
  const rawModel = process.env.GEMINI_MODEL?.trim();
  const preferredModel = (rawModel && rawModel !== 'gemini-3.5-flash' && !DEPRECATED_OR_PAID.includes(rawModel))
    ? rawModel
    : DEFAULT_MODEL;

  if (allApiKeys.length === 0) {
    return 'waduh bro, API key belum dipasang nih di file .env. masukin dulu GEMINI_API_KEY biar bisa ngobrol wkwk.';
  }

  const systemPrompt = await generateSystemInstruction(userMessage, chatHistory);
  const payload = buildGeminiPayload(userMessage, chatHistory, systemPrompt);
  const candidateModels = [preferredModel, ...FREE_MODELS.filter(m => m !== preferredModel)];

  const apiKeys = getRotatedKeys(allApiKeys);
  let quotaExhausted = false;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const currentApiKey = apiKeys[keyIndex];
    let keyQuotaHit = false;

    for (const currentModel of candidateModels) {
      const modelKey = `${currentApiKey.slice(-8)}:${currentModel}`;
      const modelCooldown = modelCooldowns.get(modelKey) || 0;
      if (Date.now() < modelCooldown) {
        continue;
      }

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(6000) : undefined
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.error?.message || `HTTP error ${response.status}`;

          if (response.status === 400 && /API_KEY_INVALID|not valid/i.test(message)) {
            keyCooldowns.set(currentApiKey, Date.now() + 60 * 60 * 1000);
            break;
          }

          if (
            response.status === 429 ||
            response.status === 403 ||
            errorData.error?.status === 'RESOURCE_EXHAUSTED' ||
            /quota|exhausted|rate limit|too many requests|tokens/i.test(message)
          ) {
            modelCooldowns.set(modelKey, Date.now() + 5 * 60 * 1000);
            keyQuotaHit = true;
            continue;
          }

          if (response.status === 404 || /no longer available|not found|not supported|unsupported/i.test(message)) {
            modelCooldowns.set(modelKey, Date.now() + 30 * 60 * 1000);
            continue;
          }

          console.error(`[Gemini API Error - ${currentModel}]`, message);
          continue;
        }

        const data = await response.json();
        const blockReason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
        if (blockReason === 'SAFETY' || blockReason === 'BLOCKLIST' || blockReason === 'PROHIBITED_CONTENT') {
          return 'waduh topiknya terlalu sensitif rek, mending bahas yang lain aja wkwk';
        }

        const candidate = data.candidates?.[0];
        const replyText = candidate?.content?.parts?.[0]?.text;

        if (replyText && replyText.trim().length > 0) {
          keyCooldowns.delete(currentApiKey);
          modelCooldowns.delete(modelKey);
          let cleaned = replyText.trim();
          cleaned = cleaned.replace(/(\p{L}+)-(\p{L}+)/gu, (match, p1, p2) => p1 + ' ' + p2);
          cleaned = cleaned.replace(/\s*[-–—]+\s*/g, ' ');
          cleaned = cleaned.replace(/\s{2,}/g, ' ');
          return cleaned.trim();
        }
      } catch (netErr) {
        console.error(`[Gemini Network Error - ${currentModel}]`, netErr.message);
      }
    }

    if (keyQuotaHit) {
      keyCooldowns.set(currentApiKey, Date.now() + 5 * 60 * 1000);
      quotaExhausted = true;
    }
  }

  if (quotaExhausted) {
    return 'Yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset';
  }

  return 'waduh, lagi agak error nih koneksinya, coba tanya sekali lagi ya bro.';
}
