import { generateSystemInstruction } from './persona.service.js';

const FREE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'];
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEPRECATED_OR_PAID = [
  'gemini-4-argon',
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-3.6-flash-lite'
];

export function buildGeminiPayload(userMessage, chatHistory = [], systemPrompt = '') {
  const contents = [];

  const recentHistory = chatHistory.slice(-6);
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
      temperature: 0.72,
      maxOutputTokens: 350,
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

export async function generateReply(userMessage, chatHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const rawModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  let model = DEPRECATED_OR_PAID.includes(rawModel) ? DEFAULT_MODEL : rawModel;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return 'Waduh bro, API Key-mu belum dipasang di file .env nih! Masukin dulu GEMINI_API_KEY-nya biar gw bisa mikir beneran, wkwk.';
  }

  const systemPrompt = await generateSystemInstruction(userMessage);
  const payload = buildGeminiPayload(userMessage, chatHistory, systemPrompt);

  const candidateModels = [model, ...FREE_MODELS.filter(m => m !== model)];

  for (const currentModel of candidateModels) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || `HTTP error ${response.status}`;

        if (
          response.status === 429 ||
          response.status === 403 ||
          errorData.error?.status === 'RESOURCE_EXHAUSTED' ||
          /quota|exhausted|rate limit|too many requests|tokens/i.test(message)
        ) {
          return 'Yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset';
        }

        if (/no longer available|not found|not supported|unsupported/i.test(message)) {
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
        return replyText.trim();
      }
    } catch (netErr) {
      console.error(`[Gemini Network Error - ${currentModel}]`, netErr.message);
    }
  }

  return 'waduh, lagi agak error nih koneksinya, coba tanya sekali lagi ya bro.';
}
