import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8787);
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const defaultDb = {
  users: [],
  policies: [],
  claims: [],
  callRequests: [],
};

function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { ...defaultDb };
  }
}

function writeDb(nextDb) {
  fs.writeFileSync(DB_PATH, JSON.stringify(nextDb, null, 2), 'utf8');
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    request.on('error', reject);
  });
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const server = http.createServer(async (request, response) => {
  const { method, url } = request;
  const requestUrl = new URL(url || '/', `http://${request.headers.host}`);
  const pathname = requestUrl.pathname;

  if (method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (method === 'GET' && pathname === '/health') {
    sendJson(response, 200, { ok: true, service: 'rexy-api' });
    return;
  }

  if (method === 'POST' && pathname === '/api/rexy/calls') {
    try {
      const body = await parseBody(request);
      const db = readDb();
      const callRequest = {
        requestId: createId('call'),
        userId: body.userId || null,
        phone: body.phone || null,
        topic: body.topic || 'General support request',
        status: 'queued',
        createdAt: new Date().toISOString(),
      };
      db.callRequests = [callRequest, ...(db.callRequests || [])];
      writeDb(db);
      sendJson(response, 201, {
        ok: true,
        endpoint: '/api/rexy/calls',
        requestId: callRequest.requestId,
      });
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Could not create call request.' });
    }
    return;
  }

  if (method === 'GET' && pathname === '/api/call-requests') {
    const db = readDb();
    sendJson(response, 200, {
      items: db.callRequests || [],
    });
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Rexy API listening on http://localhost:${PORT}`);
});

