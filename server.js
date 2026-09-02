/* ============================================================
   ZenMoney Expense Viewer — server.js
   Hardened Express backend:
   - Security headers & strict Content-Security-Policy
   - Anti-CSRF, rate limiting, and origin verification
   - Restricted static asset allowlist (no root filesystem leak)
   - Calendar date & finite float validation (1e309 fix)
   - Atomic writes, schema corruption guards, and automated backups
   - Safe local interface binding (127.0.0.1 default)
   ============================================================ */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const DATA_FILE    = path.join(__dirname, 'data.json');
const EXAMPLE_FILE = path.join(__dirname, 'data.example.json');
const BACKUP_FILE  = path.join(__dirname, 'data.json.bak');
const BACKUP_DIR   = path.join(__dirname, 'backups');
const LOCK_FILE    = path.join(__dirname, 'data.json.lock');

const ALLOWED_ORIGIN = process.env.APP_ORIGIN || null;
const ALLOWED_CURRENCIES = new Set(['RUB', 'USD', 'EUR', 'KGS', 'KZT', 'GBP', 'CNY', 'JPY']);

// ── Security Headers ─────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  );
  next();
});

// ── Rate Limiting (In-Memory per IP) ─────────────────────────
const rateLimitMap = new Map();
function rateLimit(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, reset: now + windowMs };

    if (now > record.reset) {
      record.count = 0;
      record.reset = now + windowMs;
    }

    record.count++;
    rateLimitMap.set(ip, record);

    if (record.count > limit) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// ── CORS & Preflight ─────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Zen-Viewer, X-Requested-With');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Strict Static Serving Allowlist (ZM-12) ──────────────────
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'app.js'));
});

// ── Validation Helpers ───────────────────────────────────────
function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day   = parseInt(match[3], 10);

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function cleanString(str, maxLen) {
  const s = String(str || '').replace(/\0/g, '').trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function validateDatasetSchema(data) {
  if (!Array.isArray(data)) return false;
  for (const e of data) {
    if (!e || typeof e !== 'object') return false;
    if (typeof e.date !== 'string' || typeof e.category !== 'string') return false;
    if (typeof e.amount !== 'number' || !Number.isFinite(e.amount)) return false;
  }
  return true;
}

function acquireCrossProcessLock(maxWaitMs = 5000, staleMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, `${process.pid}\n${Date.now()}`);
      return fd;
    } catch (err) {
      if (err.code === 'EEXIST') {
        try {
          const stats = fs.statSync(LOCK_FILE);
          if (Date.now() - stats.mtimeMs > staleMs) {
            fs.unlinkSync(LOCK_FILE);
            continue;
          }
        } catch (_) {}
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
      } else {
        throw err;
      }
    }
  }
  return null;
}

function releaseCrossProcessLock(fd) {
  if (fd !== null && fd !== undefined) {
    try { fs.closeSync(fd); } catch (_) {}
  }
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (_) {}
}

// ── GET /api/data & /api/data.php ───────────────────────────
app.get(['/api/data', '/api/data.php'], rateLimit(120, 60 * 1000), (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (fs.existsSync(DATA_FILE)) {
    res.sendFile(DATA_FILE);
  } else if (fs.existsSync(EXAMPLE_FILE)) {
    res.sendFile(EXAMPLE_FILE);
  } else {
    res.json([]);
  }
});

// ── POST /api/import & /api/import.php ──────────────────────
app.post(
  ['/api/import', '/api/import.php'],
  rateLimit(20, 60 * 1000),
  express.json({ limit: '1mb' }),
  (req, res) => {
    // ── CSRF & Header Verification ───────────────────────────
    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type: application/json required' });
    }

    const zenHeader = req.headers['x-zen-viewer'];
    const xhrHeader = req.headers['x-requested-with'];
    if (zenHeader !== '1' && xhrHeader !== 'XMLHttpRequest') {
      return res.status(403).json({ error: 'Missing required anti-CSRF request header' });
    }

    if (req.headers['sec-fetch-site'] === 'cross-site') {
      return res.status(403).json({ error: 'Cross-site request rejected' });
    }

    const origin = req.headers.origin;
    if (origin) {
      if (ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN) {
        return res.status(403).json({ error: 'Forbidden origin' });
      }
      try {
        const originHost = new URL(origin).host;
        const reqHost = req.headers.host;
        if (!ALLOWED_ORIGIN && originHost !== reqHost) {
          return res.status(403).json({ error: 'Forbidden origin' });
        }
      } catch (_) {
        return res.status(403).json({ error: 'Invalid origin header' });
      }
    }

    const lockFd = acquireCrossProcessLock(5000);
    if (lockFd === null) {
      return res.status(503).json({ error: 'Storage is currently busy. Please retry.' });
    }

    try {
      const incoming = req.body.entries;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ error: 'No entries provided' });
      }
      if (incoming.length > 5000) {
        return res.status(400).json({ error: 'Too many entries (max 5000)' });
      }

      // Load existing data.json with schema corruption guard
      let existing = [];
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        if (fileContent.trim() !== '') {
          try {
            const parsed = JSON.parse(fileContent);
            if (!validateDatasetSchema(parsed)) {
              console.error('Storage error: data.json schema is invalid.');
              return res.status(500).json({ error: 'Database integrity error: existing data schema is malformed.' });
            }
            existing = parsed;
          } catch (e) {
            console.error('Storage error: data.json JSON syntax error.', e);
            return res.status(500).json({ error: 'Database integrity error: existing data is malformed.' });
          }
        }
      }

      // Build deduplication lookup sets
      const existingKeys4 = new Set();
      const existingKeys3 = new Set();

      for (const e of existing) {
        const k3 = `${e.date}|${e.category}|${e.amount}`;
        existingKeys3.add(k3);
        if (e.createdDate) {
          existingKeys4.add(`${k3}|${e.createdDate}`);
        }
      }

      const newEntries = [];
      let skipped = 0;

      for (const entry of incoming) {
        if (!entry || typeof entry !== 'object') {
          skipped++;
          continue;
        }

        const date        = cleanString(entry.date, 10);
        const category    = cleanString(entry.category, 255);
        const payee       = cleanString(entry.payee, 255);
        const comment     = cleanString(entry.comment, 500);
        let   currency    = cleanString(entry.currency || 'RUB', 10).toUpperCase();
        const createdDate = cleanString(entry.createdDate, 10);

        if (!isValidCalendarDate(date)) { skipped++; continue; }
        if (createdDate && !isValidCalendarDate(createdDate)) { skipped++; continue; }
        if (!category) { skipped++; continue; }

        // Strict number validation (prevents 1e309 infinity bug)
        const rawAmount = Number(entry.amount);
        if (!Number.isFinite(rawAmount) || rawAmount <= 0 || rawAmount > 1000000000) {
          skipped++;
          continue;
        }
        const amount = Math.round(rawAmount * 100) / 100;

        if (!ALLOWED_CURRENCIES.has(currency)) {
          skipped++;
          continue;
        }

        const k3 = `${date}|${category}|${amount}`;
        const k4 = `${k3}|${createdDate}`;

        const isDuplicate = existingKeys4.has(k4) || (existingKeys3.has(k3) && !existingKeys4.has(k4));

        if (isDuplicate) {
          skipped++;
        } else {
          newEntries.push({ date, category, payee, comment, amount, currency, createdDate });
          existingKeys4.add(k4);
          existingKeys3.add(k3);
        }
      }

      if (newEntries.length > 0) {
        // Merge and sort descending by date, then createdDate
        const merged = [...existing, ...newEntries];
        merged.sort((a, b) => {
          const dateCmp = b.date.localeCompare(a.date);
          if (dateCmp !== 0) return dateCmp;
          return (b.createdDate || '').localeCompare(a.createdDate || '');
        });

        // Verified rotating backups before committing
        if (fs.existsSync(DATA_FILE)) {
          if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { mode: 0o700, recursive: true });
            try {
              fs.writeFileSync(path.join(BACKUP_DIR, '.htaccess'), 'Require all denied\n');
            } catch (_) {}
          }
          const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
          const tsBackup = path.join(BACKUP_DIR, `data-${nowStr}-${process.pid}.json`);

          fs.copyFileSync(DATA_FILE, tsBackup);
          fs.copyFileSync(DATA_FILE, BACKUP_FILE);

          const srcSize = fs.statSync(DATA_FILE).size;
          const bakSize = fs.statSync(tsBackup).size;
          if (srcSize !== bakSize) {
            throw new Error('Backup verification failed: size mismatch');
          }

          // Keep latest 10 timestamped backups
          try {
            const files = fs.readdirSync(BACKUP_DIR)
              .filter(f => f.startsWith('data-') && f.endsWith('.json'))
              .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
              .sort((a, b) => a.time - b.time);
            while (files.length > 10) {
              const oldest = files.shift();
              fs.unlinkSync(path.join(BACKUP_DIR, oldest.name));
            }
          } catch (_) {}
        }

        // Atomic write: write to temp file, then atomic rename
        const payload = JSON.stringify(merged, null, 2);
        const tmpFile = `${DATA_FILE}.tmp.${process.pid}.${Date.now()}`;
        fs.writeFileSync(tmpFile, payload, 'utf8');
        fs.renameSync(tmpFile, DATA_FILE);
      }

      res.json({ added: newEntries.length, skipped, newEntries });
    } catch (err) {
      console.error('Import error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      releaseCrossProcessLock(lockFd);
    }
  }
);

// Fallback for undefined routes
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, HOST, () => {
  console.log(`ZenMoney Viewer running at http://${HOST}:${PORT}`);
});

