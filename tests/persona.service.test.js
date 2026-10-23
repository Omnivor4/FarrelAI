import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystemInstruction } from '../src/services/persona.service.js';

test('Persona Service: generates system instruction containing Farrel persona', async () => {
  const instruction = await generateSystemInstruction();
  
  assert.ok(instruction, 'System instruction should not be empty');
  assert.match(instruction, /Farrel/i, 'Should mention Farrel identity');
  assert.match(instruction, /santai/i, 'Should include casual guidelines');
  assert.match(instruction, /1 lawan 1/i, 'Should enforce 1-on-1 private chat');
  assert.match(instruction, /ANTI-INJECTION/i, 'Should include anti-injection guard');
  assert.ok(instruction.length < 2500, `Instruction too long (${instruction.length} chars), should be token-efficient`);
});

test('Persona Service: includes relevant mind knowledge when query matches', async () => {
  const instruction = await generateSystemInstruction('gimana pendapatmu soal teknologi?');
  assert.match(instruction, /teknologi/i, 'Should include relevant thought about technology');
  assert.ok(instruction.length < 2500);
});

test('Persona Service: maintains length under 2500 characters on complex query with history', async () => {
  const history = [
    { role: 'user', text: 'kamu tahu soal koding web ga?' },
    { role: 'model', text: 'tau bro, biasanya pegang html css js react laravel' }
  ];
  const instruction = await generateSystemInstruction('sebutkan semua yang kamu tahu tentang dirimu dan teman-temanmu', history);
  assert.ok(instruction.length < 2500, `Length is ${instruction.length}, must be < 2500`);
});
