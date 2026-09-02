# ZenMoney Expense Viewer — Personal Finance Dashboard & Analytics

![Version 1.0.5](https://img.shields.io/badge/version-1.0.5-blue.svg)

**English** | [Русский](README.ru.md)

🔗 **Live Demo:** [https://mikhaildudin.ru/ztest/](https://mikhaildudin.ru/ztest/)

> [!CAUTION]
> **Authentication Required Before Deploying**
>
> This app displays your **personal financial data** (spending history, transaction amounts, categories, payees). The repository does **not include any authentication mechanism** — the demo page is intentionally open and public, serving only anonymized example data.
>
> **You must configure authentication on your server before deploying this app with real data.** Without it, anyone with the URL can:
> - 👁️ **View** your complete financial history
> - 💾 **Overwrite or corrupt your data** — the CSV import endpoint (`api/import.php` / Node.js import route) is publicly accessible and will replace `data.json` with whatever file is uploaded, causing **irreversible data loss**
>
> Recommended options depending on your hosting:
> - **Apache / cPanel**: HTTP Basic Auth via `.htaccess` + `.htpasswd` (see the [Security & Privacy](#-security--privacy) section below)
> - **Node.js / Nginx / Caddy**: reverse-proxy with password protection or session-based auth middleware
> - **Static hosting** (GitHub Pages, S3, Netlify, etc.): protect at the CDN/platform level (e.g. Netlify Identity, Cloudflare Access) or avoid deploying real data there entirely
>
> ⚠️ Failure to add authentication will expose all your financial records to the public internet and leave your stored data vulnerable to accidental or malicious overwrite.

A modern, fast, and standalone web dashboard for visualizing and analyzing personal expenses exported from **ZenMoney** ([Android](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub) / [iOS](https://apps.apple.com/ru/app/дзен-мани-учет-расходов/id905934786)).

Built entirely with vanilla JavaScript (no heavy frontend frameworks or external runtime dependencies). Loads instantly in the browser and supports deployment on both **PHP** shared hosting and **Node.js** servers.

---

## ✨ Features

- 📊 **All-Time Overview**: Total spending, monthly spending dynamics, top category breakdown, and largest transactions.
- 📅 **Monthly Breakdown**: Detailed analytics for any selected month, average daily spend, top categories of the month, and full transaction history.
- 🏷️ **Category Analysis**: Spending trends over time for individual categories, payee distributions, and detailed logs.
- 🌐 **Bilingual Interface**: Built-in support for Russian and English with a sleek dropdown switcher in the top right corner. UI labels, analytics, and dates switch instantly, while individual transaction entries (category names, payees, comments) are displayed in the language you entered them in the ZenMoney app.
- 🔄 **CSV Import with Deduplication**: Upload ZenMoney CSV exports directly through the browser UI ("Import CSV" button in the sidebar). Duplicate transactions are automatically filtered out.
- ⚡ **Dual Backend Support**:
  - **PHP / Apache** (`index.php`, `api/data.php`, `api/import.php`) — zero setup for standard shared hosting.
  - **Node.js / Express 5** (`server.js`) — lightweight, modern backend for local development or VPS.
- 🔒 **Comprehensive Security Hardening**:
  - **Strict CSP & Zero Inline Scripts**: Content-Security-Policy with no `'unsafe-inline'` script permissions.
  - **Atomic Storage & Backups**: File locking, atomic file replacement, and automatic `data.json.bak` generation.
  - **Anti-CSRF & Origin Verification**: Custom request headers and origin verification protect state-changing imports.
  - **Zero Third-Party Leaks**: Native system font stack with zero telemetry or requests to third parties.
  - **Strict Input Validation**: Rejection of non-finite float overflows (1e309 bug), calendar boundary verification, and currency whitelisting.
  - **Rate Limiting & Security Headers**: Built-in IP rate limits, `Cache-Control: no-store`, `nosniff`, and `frame-ancestors 'none'`.

---

## 📁 Project Structure

```text
zenmoney-viewer/
├── api/
│   ├── data.php            # JSON data retrieval endpoint with cache controls (PHP)
│   └── import.php          # Atomic CSV import handler with concurrency lock & CSRF check (PHP)
├── .gitignore              # Excludes sensitive data (*.csv, data.json, .htaccess, .htpasswd, logs)
├── app.js                  # Complete frontend logic, charts, filters, and i18n
├── convert.py              # Python utility script: data.csv → data.json
├── data.example.json       # Clean template dataset (tracked in Git)
├── data.example.csv        # Sample ZenMoney CSV export format
├── index.html              # HTML template for Node.js / static hosting (no inline handlers)
├── index.php               # PHP template with security headers
├── package.json            # Node.js dependencies manifest (Express 5)
├── package-lock.json       # Deterministic dependency lockfile (audited, 0 vulnerabilities)
├── server.js               # Hardened Node.js Express 5 backend
├── style.css               # Modern responsive styles using system typography
├── LICENSE                 # MIT License
├── README.md               # English documentation (this file)
└── README.ru.md            # Russian documentation
```

---

## 🚀 Quick Start

### Option 1: Run with Node.js

Requires Node.js 16+.

```bash
# 1. Install dependencies (Express)
npm install

# 2. Start the server
npm start
```
Open in your browser: **`http://localhost:3000`**

---

### Option 2: Run with PHP Built-in Server (Local)

If you have PHP 7.0+ installed:

```bash
php -S localhost:8000
```
Open in your browser: **`http://localhost:8000`**

---

### Option 3: Deploy to Web Hosting (Apache / cPanel / LAMP)

Requires **PHP 7.0+**.

1. Upload the repository files to your web server directory (e.g. `public_html/zmoney/`).
2. To password-protect access, set up Basic Auth in `.htaccess` and `.htpasswd` directly on the server:
   ```apache
   AuthType Basic
   AuthName "ZenMoney Viewer — Restricted Access"
   AuthUserFile /full/path/to/.htpasswd
   Require valid-user
   ```
3. Ensure the web server has write permissions for `data.json` (to allow CSV importing):
   ```bash
   chmod 664 data.json
   ```

---

## 📥 How to Export Data from ZenMoney

### 📲 Exporting from the ZenMoney App:
1. Open the ZenMoney app ([Android](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub) / [iOS](https://apps.apple.com/ru/app/дзен-мани-учет-расходов/id905934786) or web version).
2. Navigate to **Account Settings → Export transactions to CSV** (in Russian: *Настройка аккаунта > Экспорт операций в CSV*).
3. Select the export period: typically, choose **"Full history"** (*Вся история*) to import all past transactions.
4. Tap **Export** and save the downloaded CSV file to your device.

> [!TIP]
> **Dataset Language:** The language switcher in the dashboard translates the interface, charts, date formatting, and system labels. The language of individual transaction entries (categories, payees, notes) depends entirely on how you entered them in the ZenMoney app.

### 💻 Importing Data into the Dashboard:

#### Method 1: Directly via Web Interface (Recommended)
1. In the dashboard, click the **"Import CSV"** button in the left sidebar.
2. Select your exported `.csv` file.
3. The app automatically processes all records: filters out income and internal transfers between your own accounts, eliminates duplicates, and refreshes the dashboard instantly.

#### Method 2: Via Python Script (For Static Hosting)
The `convert.py` script (requires **Python 3.6+**) serves as an offline data processor. It is extremely useful if you want to deploy the dashboard on purely static hosting (like GitHub Pages or AWS S3) where PHP/Node.js backend scripts cannot run to handle CSV uploads.

It automatically extracts only the necessary fields, filters out incomes, internal transfers, and uncategorized transactions, and creates a lightweight JSON file for fast loading.

1. Save the exported file as `data.csv` in the project root.
2. Run the converter:
   ```bash
   python convert.py
   ```
3. The script generates an optimized `data.json` which you can upload directly to your static hosting alongside the frontend files.

---

## 🔐 Security & Privacy

> [!CAUTION]
> **This repository does not include any authentication.** The demo page at [mikhaildudin.ru/ztest/](https://mikhaildudin.ru/ztest/) is publicly accessible and uses only anonymized sample data — it intentionally has no login protection.
>
> **You are strictly required to add authentication before deploying this app with your real financial data.** Without access restrictions, anyone who discovers the URL can:
> - 👁️ **Read** all your financial records
> - 💾 **Overwrite or permanently destroy your data** — the CSV import endpoint (`api/import.php` / Node.js import route) is unauthenticated and will silently replace `data.json` with any uploaded file, causing **irreversible data loss**

### Authentication Setup by Hosting Type

**Apache / cPanel (shared hosting) — HTTP Basic Auth:**

Create `.htaccess` and `.htpasswd` directly on your server (do **not** commit these files to Git — they are excluded via `.gitignore`):

```apache
AuthType Basic
AuthName "ZenMoney Viewer — Restricted Access"
AuthUserFile /full/server/path/to/.htpasswd
Require valid-user
```

Generate the password hash (run on your server or locally with Apache utils):
```bash
htpasswd -c /full/server/path/to/.htpasswd your_username
```

**Node.js — Basic Auth middleware:**
```bash
npm install express-basic-auth
```
```js
const basicAuth = require('express-basic-auth');
app.use(basicAuth({ users: { 'admin': 'your_strong_password' }, challenge: true }));
```

**Static hosting (GitHub Pages, Netlify, AWS S3, etc.):**
These platforms cannot enforce server-side auth on their own. Use one of:
- **Cloudflare Access** (free tier available) — adds login in front of any public URL
- **Netlify Identity** — built-in auth gate for Netlify deployments
- Or simply **do not deploy real data to static hosting** — use `convert.py` only locally and only upload to a protected server

> [!IMPORTANT]
> Never commit or publish your personal `data.json`, `*.csv` export files, or `.htpasswd` passwords file to public GitHub repositories. The repository includes a pre-configured `.gitignore` that automatically excludes these files. Use `data.example.json` and `data.example.csv` as clean reference templates.

**Apache — block direct file downloads:**
```apache
<FilesMatch "^(data\.json.*|data\.csv|zen_history\.csv|convert\.py|\.htpasswd)">
    Require all denied
</FilesMatch>
```
This prevents sensitive raw files and backups from being directly downloaded by URL even if someone guesses the path.

### Built-in Application Protections (v1.0.5)

In addition to web server authentication, the application codebase enforces core defensive controls:
- **Strict Content Security Policy (CSP)**: `script-src 'self'` with zero inline scripts or inline `onclick` attributes.
- **Anti-CSRF & Origin Verification**: State-changing import endpoints require custom request headers (`X-Zen-Viewer: 1` / `X-Requested-With: XMLHttpRequest`) and reject cross-site forged requests (`Sec-Fetch-Site: cross-site`).
- **Atomic Writes & Concurrency Lock**: Data persistence uses process-level file locks (`flock` in PHP) and atomic filesystem replacement (`rename`) to prevent race conditions or corrupted partial writes.
- **Automated Backups**: Prior to modifying `data.json`, an automatic backup `data.json.bak` is preserved.
- **Strict Data Validation**: Calendar validation prevents impossible dates (e.g. Feb 31), numeric bounds prevent float overflows (`1e309` infinity truncation bug), and strict currency whitelisting is enforced.
- **Privacy by Default**: Zero third-party telemetry or font queries — all typography runs on the native operating system font stack.
- **Rate Limiting & Security Headers**: Built-in IP rate limits guard endpoints, paired with `Cache-Control: no-store, private`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
- **Restricted Static Serving**: Express backend exclusively serves allowlisted frontend assets (`/`, `/index.html`, `/style.css`, `/app.js`), preventing exposure of backend scripts or source files.

---

## 📄 License

Distributed under the [MIT](LICENSE) License.
