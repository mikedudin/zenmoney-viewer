/* ============================================================
   ZenMoney Expense Viewer — server.js
   Lightweight Express backend:
   - Serves static files from this directory
   - GET  /api/data, /api/data.php   — returns data.json
   - POST /api/import, /api/import.php — merges new CSV entries into data.json
   ============================================================ */

const express  = require('express');
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const ALLOWED_ORIGIN = process.env.APP_ORIGIN || null;
const ALLOWED_CURRENCIES = new Set(['RUB', 'USD', 'EUR', 'KGS', 'KZT', 'GBP', 'CNY', 'JPY']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── CORS (M-3) ────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGIN || origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

/* ── GET /api/data & /api/data.php ─────────────────────────── */
app.get(['/api/data', '/api/data.php'], (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.sendFile(DATA_FILE);
  } else {
    res.json([]);
  }
});

/* ── POST /api/import & /api/import.php ──────────────────────
   Body: { entries: [ { date, category, payee, comment,
                         amount, currency, createdDate } ] }
   Response: { added, skipped, newEntries }
   ─────────────────────────────────────────────────────── */
app.post(['/api/import', '/api/import.php'], (req, res) => {
  try {
    const incoming = req.body.entries;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ error: 'No entries provided' });
    }
    if (incoming.length > 5000) {
      return res.status(400).json({ error: 'Too many entries (max 5000)' });
    }

    // Load current data.json
    let existing = [];
    if (fs.existsSync(DATA_FILE)) {
      existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }

    // Build lookup sets for duplicate detection
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
      // ── M-1: per-field validation ───────────────────────────────
      const date        = String(entry.date        || '');
      const category    = String(entry.category    || '');
      const payee       = String(entry.payee       || '');
      const comment     = String(entry.comment     || '');
      const amount      = Number(entry.amount      || 0);
      let   currency    = String(entry.currency    || 'RUB').toUpperCase().trim();
      const createdDate = String(entry.createdDate || '');

      if (!DATE_RE.test(date))                                      { skipped++; continue; }
      if (createdDate && !DATE_RE.test(createdDate))                { skipped++; continue; }
      if (!category)                                                { skipped++; continue; }
      if (category.length > 255 || payee.length > 255 ||
          comment.length  > 500 || currency.length > 10)           { skipped++; continue; }
      if (isNaN(amount) || amount <= 0)                             { skipped++; continue; }
      if (!ALLOWED_CURRENCIES.has(currency)) currency = 'RUB';

      const k3 = `${date}|${category}|${amount}`;
      const k4 = `${k3}|${createdDate}`;

      // Duplicate if 4-field key matches, or 3-field matches legacy entry
      const isDuplicate = existingKeys4.has(k4) ||
        (existingKeys3.has(k3) && !existingKeys4.has(k4));

      if (isDuplicate) {
        skipped++;
      } else {
        // ── M-2: sanitized object creation ─────────────────────────
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
      fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf8');
    }

    res.json({ added: newEntries.length, skipped, newEntries });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`ZenMoney Viewer running at http://localhost:${PORT}`);
});
