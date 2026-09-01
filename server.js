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

app.use(express.json({ limit: '10mb' }));
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
      const k3 = `${entry.date}|${entry.category}|${entry.amount}`;
      const k4 = `${k3}|${entry.createdDate}`;

      // Duplicate if 4-field key matches, or 3-field matches legacy entry
      const isDuplicate = existingKeys4.has(k4) ||
        (existingKeys3.has(k3) && !existingKeys4.has(k4) &&
         !incoming.some(e => e !== entry &&
           `${e.date}|${e.category}|${e.amount}` === k3 &&
           e.createdDate && existingKeys4.has(`${k3}|${e.createdDate}`)));

      if (isDuplicate) {
        skipped++;
      } else {
        newEntries.push(entry);
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
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ZenMoney Viewer running at http://localhost:${PORT}`);
});
