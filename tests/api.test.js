import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import http from 'node:http';

let server;
let baseUrl;

test.before(async () => {
  process.env.ADMIN_PASSWORD = 'testsecretpassword';
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('API: /api/health returns ok status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
});

test('API: /api/chat rejects empty message', async () => {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' })
  });
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test('API: /api/chat returns response and logs message', async () => {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Halo rel!',
      deviceId: 'api-test-device-123',
      platform: 'Test Runner'
    })
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.reply, 'Should return reply string');
});

test('API: /api/admin/stats blocks unauthorized access', async () => {
  const res = await fetch(`${baseUrl}/api/admin/stats`);
  assert.equal(res.status, 401);
});

test('API: /api/admin/stats allows authorized access with header', async () => {
  const res = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: {
      'x-admin-key': 'testsecretpassword'
    }
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.stats, 'Should return stats object');
});
