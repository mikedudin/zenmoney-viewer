# ZenMoney Expense Viewer — Personal Finance Dashboard & Analytics

**English** | [Русский](README.ru.md)

🔗 **Live Demo:** [https://mikhaildudin.ru/ztest/](https://mikhaildudin.ru/ztest/)

A modern, fast, and standalone web dashboard for visualizing and analyzing personal expenses exported from **ZenMoney** ([Android](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub) / [iOS](https://apps.apple.com/ru/app/дзен-мани-учет-расходов/id905934786)).

Built entirely with vanilla JavaScript (no heavy frontend frameworks or external runtime dependencies). Loads instantly in the browser and supports deployment on both **PHP** shared hosting and **Node.js** servers.

---

## ✨ Features

- 📊 **All-Time Overview**: Total spending, monthly spending dynamics, top category breakdown, and largest transactions.
- 📅 **Monthly Breakdown**: Detailed analytics for any selected month, average daily spend, top categories of the month, and full transaction history.
- 🏷️ **Category Analysis**: Spending trends over time for individual categories, payee distributions, and detailed logs.
- 🌐 **Bilingual Interface**: Built-in support for Russian and English with a sleek dropdown switcher in the top right corner (powered by Google Noto Color Emoji). UI labels, analytics, and dates switch instantly, while individual transaction entries (category names, payees, comments) are displayed in the language you entered them in the ZenMoney app.
- 🔄 **CSV Import with Deduplication**: Upload ZenMoney CSV exports directly through the browser UI ("Import CSV" button in the sidebar). Duplicate transactions are automatically filtered out.
- ⚡ **Dual Backend Support**:
  - **PHP / Apache** (`index.php`, `api/data.php`, `api/import.php`) — zero setup for standard shared hosting.
  - **Node.js / Express** (`server.js`) — lightweight backend for local development or VPS.
- 🔒 **Data Protection**: Sensitive `data.json` file is protected from direct public downloads via server configuration and `.gitignore`.

---

## 📁 Project Structure

```text
zenmoney-viewer/
├── api/
│   ├── data.php            # JSON data retrieval endpoint (PHP)
│   └── import.php          # CSV import handler with deduplication (PHP)
├── .gitignore              # Excludes sensitive data (*.csv, .htaccess, .htpasswd, logs)
├── app.js                  # Complete frontend logic, charts, filters, and i18n
├── convert.py              # Python utility script: data.csv → data.json
├── data.json               # Demo dataset (clean sample data in RUB)
├── data.example.csv        # Sample ZenMoney CSV export format
├── index.html              # HTML template for Node.js / static hosting
├── index.php               # PHP template with server-side preloaded data
├── package.json            # Node.js dependencies manifest (Express)
├── server.js               # Lightweight Node.js Express backend
├── style.css               # Modern dark-themed responsive styles
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

> [!IMPORTANT]
> Never commit or publish your personal `data.json`, `*.csv` export files, or `.htpasswd` passwords file to public GitHub repositories. The repository includes a pre-configured `.gitignore` that automatically excludes these files.

On Apache servers, it is recommended to keep direct file access denied:
```apache
<FilesMatch "^(data\.json|data\.csv|zen_history\.csv|convert\.py|...)">
    Require all denied
</FilesMatch>
```
This prevents sensitive raw files from being directly downloaded by URL.

---

## 📄 License

Distributed under the [MIT](LICENSE) License.
