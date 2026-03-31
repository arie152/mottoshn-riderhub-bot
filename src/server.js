import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as envConfig, SLOT_MAX, SLOT_MIN } from './config.js';
import { createStore } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

function cleanText(input, max = 120) {
  return String(input || '').trim().replace(/[<>]/g, '').slice(0, max);
}

function json(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function parseJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  return JSON.parse(body);
}

export function buildServer(config = envConfig, store = createStore()) {
  const hits = new Map();

  function rateLimit(ip) {
    const now = Date.now();
    const entry = hits.get(ip) || { count: 0, start: now };
    if (now - entry.start > 60_000) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    hits.set(ip, entry);
    return entry.count <= 60;
  }

  function getSlots() {
    const reserved = new Map(
      store
        .getAll()
        .filter((r) => ['pending', 'confirmed'].includes(r.status))
        .map((r) => [r.riderNumber, r.status])
    );
    const slots = [];
    for (let n = SLOT_MIN; n <= SLOT_MAX; n += 1) {
      slots.push({ number: n, status: reserved.get(n) || 'available' });
    }
    return slots;
  }

  function validateReservation(input) {
    const riderNumber = Number(input.riderNumber);
    const riderName = cleanText(input.riderName);
    const phone = cleanText(input.phone, 20);
    const telegramHandle = cleanText(input.telegramHandle);

    if (!Number.isInteger(riderNumber) || riderNumber < SLOT_MIN || riderNumber > SLOT_MAX) return 'Invalid rider number';
    if (riderName.length < 2) return 'Invalid rider name';
    if (phone.length < 8) return 'Invalid phone';

    return { riderNumber, riderName, phone, telegramHandle };
  }

  return http.createServer(async (req, res) => {
    const ip = req.socket.remoteAddress || 'unknown';
    if (!rateLimit(ip)) return json(res, 429, { error: 'Rate limit exceeded. Try again shortly.' });

    if (req.method === 'GET' && req.url === '/api/config') {
      return json(res, 200, {
        holdDeadlineIso: config.holdDeadlineIso,
        paynowUen: config.paynowUen,
        paynowReferencePrefix: config.paynowReferencePrefix,
        slotMin: SLOT_MIN,
        slotMax: SLOT_MAX,
      });
    }

    if (req.method === 'GET' && req.url === '/api/slots') {
      return json(res, 200, { slots: getSlots() });
    }

    if (req.method === 'POST' && req.url === '/api/reservations') {
      try {
        const body = await parseJson(req);
        const validated = validateReservation(body);
        if (typeof validated === 'string') return json(res, 400, { error: validated });

        const saved = store.reserve(validated);
        if (!saved) return json(res, 409, { error: 'Rider number is already taken.' });

        return json(res, 201, {
          reservationId: saved.id,
          status: saved.status,
          paynowReference: `${config.paynowReferencePrefix}-${validated.riderNumber}`,
          message: 'Reservation submitted. Complete PayNow and send proof on Telegram to confirm.',
        });
      } catch {
        return json(res, 400, { error: 'Invalid JSON body' });
      }
    }

    if (req.url?.startsWith('/api/admin')) {
      const token = req.headers['x-admin-token'];
      if (token !== config.adminToken) return json(res, 401, { error: 'Unauthorized' });

      if (req.method === 'GET' && req.url === '/api/admin/reservations') {
        return json(res, 200, { reservations: store.getAll() });
      }

      const confirmMatch = req.url.match(/^\/api\/admin\/reservations\/(\d+)\/confirm$/);
      if (req.method === 'POST' && confirmMatch) {
        const ok = store.confirmById(Number(confirmMatch[1]));
        if (!ok) return json(res, 404, { error: 'Reservation not found.' });
        return json(res, 200, { ok: true });
      }
    }

    const safePath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(publicDir, safePath || '/index.html');

    if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    fs.createReadStream(filePath).pipe(res);
  });
}

if (process.argv[1] === __filename) {
  const server = buildServer();
  server.listen(envConfig.port, () => {
    console.log(`Rider Hub listening on http://localhost:${envConfig.port}`);
  });
}
