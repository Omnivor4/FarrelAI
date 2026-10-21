import { generateSystemInstruction } from './persona.service.js';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

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
      temperature: 0.88,
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
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return 'Waduh bro, API Key-mu belum dipasang di file .env nih! Masukin dulu GEMINI_API_KEY-nya biar gw bisa mikir beneran, wkwk.';
  }

  const systemPrompt = await generateSystemInstruction(userMessage);
  const payload = buildGeminiPayload(userMessage, chatHistory, systemPrompt);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP error ${response.status}`;
    console.error('[Gemini API Error]', message);
    if (
      response.status === 429 ||
      response.status === 403 ||
      errorData.error?.status === 'RESOURCE_EXHAUSTED' ||
      /quota|exhausted|rate limit|too many requests|tokens/i.test(message)
    ) {
      return 'Yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset';
    }
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text;

  if (!replyText) {
    return 'Waduh, ga dpet respon apa2 iki bro, coba tanya lagi';
  }

  return replyText.trim();
}
