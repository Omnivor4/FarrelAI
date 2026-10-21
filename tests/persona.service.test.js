import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystemInstruction } from '../src/services/persona.service.js';

test('Persona Service: generates system instruction containing Farrel persona', async () => {
  const instruction = await generateSystemInstruction();
  
  assert.ok(instruction, 'System instruction should not be empty');
  assert.match(instruction, /Farrel/i, 'Should mention Farrel identity');
  assert.match(instruction, /santai/i, 'Should include casual guidelines');
  assert.ok(instruction.length < 2500, `Instruction too long (${instruction.length} chars), should be token-efficient`);
});

test('Persona Service: includes relevant mind knowledge when query matches', async () => {
  const instruction = await generateSystemInstruction('gimana pendapatmu soal teknologi?');
  assert.match(instruction, /teknologi/i, 'Should include relevant thought about technology');
});
