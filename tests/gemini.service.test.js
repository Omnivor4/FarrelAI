import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReply } from '../src/services/gemini.service.js';

test('Gemini Service: returns fallback reply when API key is missing', async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalKey2 = process.env.GEMINI_API_KEY2;
  const originalKey_2 = process.env.GEMINI_API_KEY_2;
  const originalKeyBackup = process.env.GEMINI_API_KEY_BACKUP;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY2;
  delete process.env.GEMINI_API_KEY_2;
  delete process.env.GEMINI_API_KEY_BACKUP;

  const reply = await generateReply('Halo bro', []);
  assert.ok(reply, 'Reply should not be empty');
  assert.match(reply, /API key/i, 'Should remind about setting up API key in fallback mode');

  if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  if (originalKey2) process.env.GEMINI_API_KEY2 = originalKey2;
  if (originalKey_2) process.env.GEMINI_API_KEY_2 = originalKey_2;
  if (originalKeyBackup) process.env.GEMINI_API_KEY_BACKUP = originalKeyBackup;
});

test('Gemini Service: builds valid contents payload', async () => {
  const { buildGeminiPayload } = await import('../src/services/gemini.service.js');
  const payload = buildGeminiPayload('Halo bro', [{ role: 'user', text: 'Hai' }, { role: 'model', text: 'Halo' }], 'System prompt');
  
  assert.equal(payload.contents.length, 3, 'Should include history and new user message');
  assert.equal(payload.contents[2].parts[0].text, 'Halo bro');
  assert.ok(payload.systemInstruction, 'Should include system instruction');
});

test('Gemini Service: falls back to secondary API key when primary hits 429 quota error', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalKey2 = process.env.GEMINI_API_KEY2;
  process.env.GEMINI_API_KEY = 'primary-key';
  process.env.GEMINI_API_KEY2 = 'backup-key';

  const usedKeys = [];
  global.fetch = async (url) => {
    const key = new URL(url).searchParams.get('key');
    usedKeys.push(key);
    if (key === 'primary-key') {
      return {
        ok: false,
        status: 429,
        json: async () => ({
          error: { code: 429, message: 'Resource has been exhausted.', status: 'RESOURCE_EXHAUSTED' }
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Halo dari backup key!' }] } }]
      })
    };
  };

  const reply = await generateReply('Halo bro', []);
  assert.equal(reply, 'Halo dari backup key!');
  assert.ok(usedKeys.includes('primary-key'), 'Should have tried primary key');
  assert.ok(usedKeys.includes('backup-key'), 'Should have fallen back to backup key');

  global.fetch = originalFetch;
  process.env.GEMINI_API_KEY = originalKey;
  if (originalKey2) process.env.GEMINI_API_KEY2 = originalKey2;
  else delete process.env.GEMINI_API_KEY2;
});

test('Gemini Service: returns token exhausted warning on 429 quota error', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalKey2 = process.env.GEMINI_API_KEY2;
  const originalKey_2 = process.env.GEMINI_API_KEY_2;
  const originalKeyBackup = process.env.GEMINI_API_KEY_BACKUP;
  process.env.GEMINI_API_KEY = 'fake-api-key';
  delete process.env.GEMINI_API_KEY2;
  delete process.env.GEMINI_API_KEY_2;
  delete process.env.GEMINI_API_KEY_BACKUP;

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
  if (originalKey2) process.env.GEMINI_API_KEY2 = originalKey2;
  if (originalKey_2) process.env.GEMINI_API_KEY_2 = originalKey_2;
  if (originalKeyBackup) process.env.GEMINI_API_KEY_BACKUP = originalKeyBackup;
});
