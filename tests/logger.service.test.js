import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logInteraction, getDevices, getChatLogs } from '../src/services/firebase.service.js';

test('Logger Service: logs an interaction and creates device record', async () => {
  process.env.NODE_ENV = 'test';
  const testDeviceId = 'test-device-' + Date.now();
  const testPlatform = 'Windows / Chrome';
  const userMsg = 'Halo Farrel!';
  const botReply = 'halo juga, ini siapa ya?';

  await logInteraction({
    deviceId: testDeviceId,
    platform: testPlatform,
    userMessage: userMsg,
    botReply: botReply
  });

  const devices = await getDevices();
  const foundDevice = devices.find(d => d.deviceId === testDeviceId);
  assert.ok(foundDevice, 'Logged device should exist in device list');
  assert.equal(foundDevice.platform, testPlatform);
  assert.ok(foundDevice.messageCount >= 1);

  const logs = await getChatLogs({ deviceId: testDeviceId });
  assert.ok(logs.length > 0, 'Should find logged chats');
  assert.equal(logs[0].userMessage, userMsg);
  assert.equal(logs[0].botReply, botReply);

  try {
    const devicesFile = path.resolve('data/devices.json');
    const allDevs = JSON.parse(await fs.readFile(devicesFile, 'utf-8'));
    await fs.writeFile(devicesFile, JSON.stringify(allDevs.filter(d => d.deviceId !== testDeviceId), null, 2), 'utf-8');
  } catch {}
});
