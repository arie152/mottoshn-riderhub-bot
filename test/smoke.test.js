import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.js';

function fakeStore() {
  const reservations = [];
  let nextId = 1;
  return {
    getAll: () => reservations,
    reserve(payload) {
      const taken = reservations.find((r) => r.riderNumber === payload.riderNumber && ['pending', 'confirmed'].includes(r.status));
      if (taken) return null;
      const item = { id: nextId++, ...payload, status: 'pending' };
      reservations.push(item);
      return item;
    },
    confirmById(id) {
      const found = reservations.find((r) => r.id === id);
      if (!found) return false;
      found.status = 'confirmed';
      return true;
    },
  };
}

const cfg = {
  adminToken: 'token',
  holdDeadlineIso: '2026-04-30T15:59:59Z',
  paynowUen: 'UEN1',
  paynowReferencePrefix: 'RIDER',
};

test('config endpoint returns paynow config', async () => {
  const server = buildServer(cfg, fakeStore());
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/api/config`);
  const json = await res.json();

  server.close();
  assert.equal(res.status, 200);
  assert.equal(json.paynowUen, 'UEN1');
});

test('reservation endpoint blocks duplicates', async () => {
  const server = buildServer(cfg, fakeStore());
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const payload = {
    riderNumber: 9,
    riderName: 'Alice',
    phone: '+6591111111',
    telegramHandle: '@alice',
  };

  const first = await fetch(`http://127.0.0.1:${port}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const second = await fetch(`http://127.0.0.1:${port}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  server.close();
  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
});
