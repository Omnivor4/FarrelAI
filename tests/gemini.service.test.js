import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReply } from '../src/services/gemini.service.js';

test('Gemini Service: returns fallback reply when API key is missing', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';

  const reply = await generateReply('Halo bro', []);
  assert.ok(reply, 'Reply should not be empty');
  assert.match(reply, /API key/i, 'Should remind about setting up API key in fallback mode');

  process.env.GEMINI_API_KEY = originalKey;
});

test('Gemini Service: builds valid contents payload', async () => {
  const { buildGeminiPayload } = await import('../src/services/gemini.service.js');
  const payload = buildGeminiPayload('Halo bro', [{ role: 'user', text: 'Hai' }, { role: 'model', text: 'Halo' }], 'System prompt');
  
  assert.equal(payload.contents.length, 3, 'Should include history and new user message');
  assert.equal(payload.contents[2].parts[0].text, 'Halo bro');
  assert.ok(payload.systemInstruction, 'Should include system instruction');
});

test('Gemini Service: returns token exhausted warning on 429 quota error', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fake-api-key';

  global.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({
      error: {
        code: 429,
        message: 'Resource has been exhausted (e.g. check quota).',
        status: 'RESOURCE_EXHAUSTED'
      }
    })
  });

  const reply = await generateReply('Halo bro', []);
  assert.equal(reply, 'Yailah token e habis, tunggu besok ya atau ngga nanti malem sapa tau ws reset');

  global.fetch = originalFetch;
  process.env.GEMINI_API_KEY = originalKey;
});
