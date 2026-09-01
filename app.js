/* ============================================================
   ZenMoney Expense Viewer — app.js
   ============================================================ */

// ── Category colour palette ──────────────────────────────────
const PALETTE = [
  '#4f46e5','#7c3aed','#2563eb','#0891b2','#059669',
  '#16a34a','#d97706','#dc2626','#db2777','#9333ea',
  '#0284c7','#ea580c','#65a30d','#854d0e','#1d4ed8',
  '#6d28d9','#be123c','#0f766e','#a16207','#6b7280',
];
const catColorMap = {};
let catColorIdx = 0;
function catColor(cat) {
  if (!catColorMap[cat]) { catColorMap[cat] = PALETTE[catColorIdx++ % PALETTE.length]; }
  return catColorMap[cat];
}

// ── State ────────────────────────────────────────────────────
let allData = [];
let mode = 'overview';   // 'overview' | 'months' | 'categories'
let selected = null;
let sidebarOpen = true;
let currentLang = localStorage.getItem('zen_lang') || 'ru'; // 'ru' | 'en'

// ── Internationalization (i18n) ──────────────────────────────
const I18N = {
  ru: {
    title: 'Расходы — ZenMoney Viewer',
    logo: 'Расходы',
    mode: 'Режим',
    overview: 'Обзор',
    months: 'По месяцам',
    categories: 'По категориям',
    importCsv: 'Импорт CSV',
    importUploading: 'Загрузка…',
    importDone: 'Импорт завершён',
    importError: 'Ошибка импорта',
    added: 'Добавлено',
    skipped: 'Пропущено',
    ok: 'OK',
    loading: 'Загрузка…',
    loadingData: 'Загрузка данных…',
    loadError: 'Ошибка загрузки данных: ',
    allTimeTotal: 'Итого за всё время',
    txCount: (n) => `${n} транзакций`,
    monthsCount: (n) => `${n} месяцев истории`,
    monthsCountShort: (n) => `${n} месяцев`,
    avgMonthly: 'Среднее в месяц',
    avgPerDay: 'Среднее в день',
    categoriesTitle: 'Категорий',
    uniqueArticles: 'уникальных статей',
    uniqueCount: 'уникальных',
    maxTx: 'Макс. транзакция',
    heatmapTitle: 'Тепловая карта расходов',
    last13Months: 'последние 13 месяцев',
    noExpenses: 'нет расходов',
    less: 'Меньше',
    more: 'Больше',
    clickToView: 'Нажмите для просмотра',
    top5Cats: 'Топ-5 категорий',
    allTime: 'за всё время',
    otherCats: (n) => `Остальные ${n} категорий`,
    topTxTitle: 'Крупнейшие транзакции',
    top8: 'топ-8',
    monthlyTotal: 'Итого за месяц',
    topCat: 'Главная статья',
    catDistribution: 'Распределение по категориям',
    totalByCat: 'Всего по категории',
    shareOfTotal: 'Доля в общих расходах',
    fromGrandTotal: (total) => `от ${total}`,
    monthsWithExpenses: 'Месяцев с расходами',
    monthsUnit: 'месяц(ев)',
    avgCheck: 'Средний чек',
    perTx: 'за транзакцию',
    byMonthsTitle: 'По месяцам',
    noData: 'Нет данных',
    dateCol: 'Дата',
    commentCol: 'Комментарий / Получатель',
    amountCol: 'Сумма',
    noMatchingRecords: 'Файл не содержит подходящих записей (расходов).',
    serverError: 'Ошибка сервера',
    serverOpenHint: 'Откройте приложение через сервер: запустите «npm start» и перейдите на http://localhost:3000',
    monthNames: [
      'Январь','Февраль','Март','Апрель','Май','Июнь',
      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
    ],
    monthsShort: [
      'Янв','Фев','Мар','Апр','Май','Июн',
      'Июл','Авг','Сен','Окт','Ноя','Дек'
    ],
    monthsGen: [
      'января','февраля','марта','апреля','мая','июня',
      'июля','августа','сентября','октября','ноября','декабря'
    ],
    dayLabels: ['Пн','','Ср','','Пт','','']
  },
  en: {
    title: 'Expenses — ZenMoney Viewer',
    logo: 'Expenses',
    mode: 'Mode',
    overview: 'Overview',
    months: 'By Month',
    categories: 'By Category',
    importCsv: 'Import CSV',
    importUploading: 'Uploading…',
    importDone: 'Import Completed',
    importError: 'Import Error',
    added: 'Added',
    skipped: 'Skipped',
    ok: 'OK',
    loading: 'Loading…',
    loadingData: 'Loading data…',
    loadError: 'Failed to load data: ',
    allTimeTotal: 'All-Time Total',
    txCount: (n) => `${n} transactions`,
    monthsCount: (n) => `${n} months of history`,
    monthsCountShort: (n) => `${n} months`,
    avgMonthly: 'Monthly Average',
    avgPerDay: 'Daily Average',
    categoriesTitle: 'Categories',
    uniqueArticles: 'unique categories',
    uniqueCount: 'unique',
    maxTx: 'Max Transaction',
    heatmapTitle: 'Expense Heatmap',
    last13Months: 'last 13 months',
    noExpenses: 'no expenses',
    less: 'Less',
    more: 'More',
    clickToView: 'Click to view',
    top5Cats: 'Top 5 Categories',
    allTime: 'all-time',
    otherCats: (n) => `Other ${n} categories`,
    topTxTitle: 'Largest Transactions',
    top8: 'top 8',
    monthlyTotal: 'Monthly Total',
    topCat: 'Top Category',
    catDistribution: 'Category Breakdown',
    totalByCat: 'Total in Category',
    shareOfTotal: 'Share of Total',
    fromGrandTotal: (total) => `of ${total}`,
    monthsWithExpenses: 'Months with Expenses',
    monthsUnit: 'month(s)',
    avgCheck: 'Average Check',
    perTx: 'per transaction',
    byMonthsTitle: 'By Month',
    noData: 'No data',
    dateCol: 'Date',
    commentCol: 'Comment / Payee',
    amountCol: 'Amount',
    noMatchingRecords: 'The file contains no matching expense records.',
    serverError: 'Server error',
    serverOpenHint: 'Open app via server: run "npm start" and navigate to http://localhost:3000',
    monthNames: [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ],
    monthsShort: [
      'Jan','Feb','Mar','Apr','May','Jun',
      'Jul','Aug','Sep','Oct','Nov','Dec'
    ],
    monthsGen: [
      'Jan','Feb','Mar','Apr','May','Jun',
      'Jul','Aug','Sep','Oct','Nov','Dec'
    ],
    dayLabels: ['Mon','','Wed','','Fri','','']
  }
};

function t(key, ...args) {
  const dict = I18N[currentLang] || I18N.ru;
  const val = dict[key] !== undefined ? dict[key] : (I18N.ru[key] || key);
  if (typeof val === 'function') return val(...args);
  return val;
}

// ── Formatters ───────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat(currentLang === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 0 }).format(n);
}
function getCurrency() {
  return (allData[0] && allData[0].currency) ? allData[0].currency : 'RUB';
}
function getCurrencySymbol() {
  const c = getCurrency();
  if (c === 'RUB') return '₽';
  if (c === 'USD') return '$';
  if (c === 'EUR') return '€';
  if (c === 'KGS') return 'KGS';
  return c;
}
const fmtAmt = (n) => fmt(n) + ' ' + getCurrencySymbol();

function monthLabel(key) {
  const [y, m] = key.split('-');
  const months = (I18N[currentLang] || I18N.ru).monthNames;
  return months[+m - 1] + ' ' + y;
}
function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (currentLang === 'en') {
    const months = I18N.en.monthsShort;
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  const months = I18N.ru.monthsGen;
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
function monthKey(dateStr) { return dateStr.slice(0, 7); }

// ── Language Switcher UI ─────────────────────────────────────
function toggleLangDropdown(event) {
  if (event) event.stopPropagation();
  const el = document.getElementById('lang-switch');
  if (el) el.classList.toggle('open');
}

function closeLangDropdown() {
  const el = document.getElementById('lang-switch');
  if (el) el.classList.remove('open');
}

function selectLang(lang) {
  if (lang !== 'ru' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('zen_lang', lang);
  closeLangDropdown();
  updateStaticTranslations();
  renderSidebar();
  renderContent();
}

function updateStaticTranslations() {
  document.title = t('title');

  const logoText = document.querySelector('.logo-text');
  if (logoText) logoText.textContent = t('logo');

  const navSection = document.querySelector('.nav-section-label');
  if (navSection) navSection.textContent = t('mode');

  const btnOverview = document.getElementById('btn-overview');
  if (btnOverview) {
    const svg = btnOverview.querySelector('svg');
    btnOverview.innerHTML = (svg ? svg.outerHTML : '') + ' ' + t('overview');
  }
  const btnMonths = document.getElementById('btn-months');
  if (btnMonths) {
    const svg = btnMonths.querySelector('svg');
    btnMonths.innerHTML = (svg ? svg.outerHTML : '') + ' ' + t('months');
  }
  const btnCats = document.getElementById('btn-categories');
  if (btnCats) {
    const svg = btnCats.querySelector('svg');
    btnCats.innerHTML = (svg ? svg.outerHTML : '') + ' ' + t('categories');
  }
  const uploadLabel = document.getElementById('upload-label');
  const uploadText = document.querySelector('.upload-label-text');
  if (uploadText && uploadLabel && !uploadLabel.classList.contains('uploading')) {
    uploadText.textContent = t('importCsv');
  }

  // Update Language switcher UI
  const flagEl = document.getElementById('current-lang-flag');
  const labelEl = document.getElementById('current-lang-label');
  if (flagEl) flagEl.textContent = currentLang === 'en' ? '🇬🇧' : '🇷🇺';
  if (labelEl) labelEl.textContent = currentLang === 'en' ? 'EN' : 'RU';

  document.querySelectorAll('.lang-item').forEach(el => {
    const l = el.getAttribute('data-lang');
    el.classList.toggle('active', l === currentLang);
  });
}

// ── Data helpers ─────────────────────────────────────────────
function groupBy(data, keyFn) {
  const map = {};
  for (const e of data) {
    const k = keyFn(e);
    if (!map[k]) map[k] = [];
    map[k].push(e);
  }
  return map;
}
const groupByMonth    = (data) => groupBy(data, e => monthKey(e.date));
const groupByCategory = (data) => groupBy(data, e => e.category);
const sumAmount       = (arr)  => arr.reduce((s, e) => s + e.amount, 0);

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // On mobile, sidebar starts closed so the content is immediately accessible
  if (window.innerWidth <= 680) {
    sidebarOpen = false;
  }

  // Setup language switcher outside click listener
  document.addEventListener('click', (e) => {
    const container = document.getElementById('lang-switch');
    if (container && !container.contains(e.target)) {
      closeLangDropdown();
    }
  });

  // Apply initial translations
  updateStaticTranslations();


  // Wire CSV upload input
  document.getElementById('csv-upload').addEventListener('change', function () {
    handleCsvUpload(this.files[0]);
  });

  try {
    if (window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA) && window.INITIAL_DATA.length > 0) {
      allData = window.INITIAL_DATA;
    } else {
      let res;
      try {
        res = await fetch('api/data.php');
        if (!res.ok) throw new Error();
      } catch (_) {
        try {
          res = await fetch('index.php?api=data');
          if (!res.ok) throw new Error();
        } catch (_) {
          res = await fetch('data.json');
        }
      }
      allData = await res.json();
    }
    allData.sort((a, b) => b.date.localeCompare(a.date));
    renderSidebar();
    renderContent();
  } catch (err) {
    document.getElementById('content').innerHTML =
      `<div class="loading-state"><p style="color:var(--color-red)">${t('loadError')}${escHtml(err.message)}</p></div>`;
  }
}

// ── Sidebar ──────────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('sidebar-list');

  if (mode === 'overview') {
    const grandTotal  = sumAmount(allData);
    const monthCount  = Object.keys(groupByMonth(allData)).length;
    list.innerHTML = `
      <div style="padding:16px 12px">
        <div style="font-size:10px;font-weight:600;letter-spacing:.8px;color:var(--color-text-3);text-transform:uppercase;margin-bottom:12px">${t('allTimeTotal')}</div>
        <div style="font-size:22px;font-weight:700;color:var(--color-text);letter-spacing:-.5px">${fmt(Math.round(grandTotal))}</div>
        <div style="font-size:12px;color:var(--color-text-3);margin-top:4px">${getCurrencySymbol()} · ${t('txCount', allData.length)}</div>
        <div style="font-size:12px;color:var(--color-text-3);margin-top:2px">${t('monthsCount', monthCount)}</div>
      </div>`;
    return;
  }

  if (mode === 'months') {
    const byMonth = groupByMonth(allData);
    const keys    = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
    const byYear  = {};
    for (const k of keys) {
      const y = k.split('-')[0];
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(k);
    }
    let html = '';
    const monthsArr = (I18N[currentLang] || I18N.ru).monthNames;
    for (const year of Object.keys(byYear).sort((a, b) => b - a)) {
      html += `<div class="sidebar-section-label">${year}</div>`;
      for (const k of byYear[year]) {
        const total    = sumAmount(byMonth[k]);
        const isActive = k === selected;
        const monthNum = +k.split('-')[1] - 1;
        html += `<div class="sidebar-entry${isActive ? ' active' : ''}" onclick="selectItem('${k}')">
          <span class="sidebar-entry-label">${monthsArr[monthNum]}</span>
          <span class="sidebar-entry-amount">${fmt(total)}</span>
        </div>`;
      }
    }
    list.innerHTML = html;
    return;
  }

  // categories
  const byCat = groupByCategory(allData);
  const cats  = Object.keys(byCat).sort((a, b) => sumAmount(byCat[b]) - sumAmount(byCat[a]));
  let html = `<div class="sidebar-section-label">${t('categoriesTitle')}</div>`;
  for (const cat of cats) {
    const total    = sumAmount(byCat[cat]);
    const isActive = cat === selected;
    html += `<div class="sidebar-entry${isActive ? ' active' : ''}" onclick="selectItem('${escAttr(cat)}')">
      <span class="sidebar-entry-label">${escHtml(cat)}</span>
      <span class="sidebar-entry-amount">${fmt(total)}</span>
    </div>`;
  }
  list.innerHTML = html;
}

// ── Mode switch ──────────────────────────────────────────────
function switchMode(m) {
  mode = m;
  document.getElementById('btn-overview').classList.toggle('active',    m === 'overview');
  document.getElementById('btn-months').classList.toggle('active',      m === 'months');
  document.getElementById('btn-categories').classList.toggle('active',  m === 'categories');

  if (m === 'months') {
    const months = [...new Set(allData.map(e => monthKey(e.date)))].sort((a, b) => b.localeCompare(a));
    selected = months[0];
  } else if (m === 'categories') {
    const byCat = groupByCategory(allData);
    const cats  = Object.keys(byCat).sort((a, b) => sumAmount(byCat[b]) - sumAmount(byCat[a]));
    selected    = cats[0];
  } else {
    selected = null;
  }
  renderSidebar();
  renderContent();
  // Close sidebar drawer on mobile after selection
  if (isMobile()) closeSidebarMobile();
}

function selectItem(key) {
  selected = key;
  renderSidebar();
  renderContent();
  // Close sidebar drawer on mobile after selection
  if (isMobile()) closeSidebarMobile();
}


function isMobile() {
  return window.innerWidth <= 680;
}

function openSidebarMobile() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebar-backdrop').classList.add('active');
  sidebarOpen = true;
}

function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop').classList.remove('active');
  sidebarOpen = false;
}

function toggleSidebar() {
  if (isMobile()) {
    if (sidebarOpen) {
      closeSidebarMobile();
    } else {
      openSidebarMobile();
    }
  } else {
    sidebarOpen = !sidebarOpen;
    document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  }
}


function renderContent() {
  if      (mode === 'overview')    renderOverview();
  else if (mode === 'months')      renderMonthView();
  else                             renderCategoryView();
}

// ════════════════════════════════════════════════════════════
// CSV IMPORT
// ════════════════════════════════════════════════════════════

/* Parse ZenMoney semicolon-delimited CSV.
   Returns array of raw row objects keyed by header names. */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse a single CSV line respecting quoted fields
  function parseLine(line) {
    const fields = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === ';' && !inQ) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields.map(f => f.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  }

  // Strip UTF-8 BOM if present on first header
  const headers = parseLine(lines[0].replace(/^\uFEFF/, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const obj  = {};
    for (let h = 0; h < headers.length; h++) {
      obj[headers[h]] = vals[h] !== undefined ? vals[h] : '';
    }
    rows.push(obj);
  }
  return rows;
}

/* Convert a raw CSV row object to a data.json entry.
   Returns null if row should be skipped. */
function csvRowToEntry(row) {
  const cat = (row['categoryName'] || '').trim();
  if (!cat || cat === 'Без категории') return null;

  const outcome = parseFloat(row['outcome']) || 0;
  const income  = parseFloat(row['income'])  || 0;
  if (outcome <= 0 || income > 0) return null;

  return {
    date:        (row['date'] || '').trim(),
    category:    (row['categoryName'] || '').trim(),
    payee:       (row['payee'] || '').trim(),
    comment:     (row['comment'] || '').trim(),
    amount:      outcome,
    currency:    (row['outcomeCurrencyShortTitle'] || 'RUB').trim(),
    createdDate: (row['createdDate'] || '').trim(),
  };
}

/* Main upload handler — called when file input changes. */
async function handleCsvUpload(file) {
  if (!file) return;

  if (location.protocol === 'file:') {
    showImportError(t('serverOpenHint'));
    document.getElementById('csv-upload').value = '';
    return;
  }

  const label = document.getElementById('upload-label');
  const origText = label.querySelector('.upload-label-text').textContent;
  label.classList.add('uploading');
  label.querySelector('.upload-label-text').textContent = t('importUploading');

  try {
    const text    = await file.text();
    const rawRows = parseCSV(text);
    const entries = rawRows.map(csvRowToEntry).filter(Boolean);

    if (entries.length === 0) {
      showImportError(t('noMatchingRecords'));
      return;
    }

    let resp;
    try {
      resp = await fetch('api/import.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entries }),
      });
      if (!resp.ok) throw new Error();
    } catch (_) {
      resp = await fetch('api/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entries }),
      });
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      showImportError(err.error || t('serverError'));
      return;
    }

    const result = await resp.json();
    showImportResult(result);

  } catch (err) {
    showImportError(err.message);
  } finally {
    label.classList.remove('uploading');
    label.querySelector('.upload-label-text').textContent = origText;
    document.getElementById('csv-upload').value = '';
  }
}

/* Show the import result overlay with stats and new entries list. */
function showImportResult(result) {
  const { added, skipped, newEntries } = result;

  document.getElementById('import-modal-icon').textContent  = '✓';
  document.getElementById('import-modal-icon').className    = 'import-modal-icon';
  document.getElementById('import-modal-title').textContent = t('importDone');

  document.getElementById('import-stats').innerHTML = `
    <div class="import-stat">
      <div class="import-stat-value green">${added}</div>
      <div class="import-stat-label">${t('added')}</div>
    </div>
    <div class="import-stat">
      <div class="import-stat-value gray">${skipped}</div>
      <div class="import-stat-label">${t('skipped')}</div>
    </div>`;

  const listEl = document.getElementById('import-result-list');
  if (newEntries && newEntries.length > 0) {
    listEl.classList.add('has-items');
    listEl.innerHTML = newEntries
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e => `
        <div class="import-result-row">
          <span class="import-result-date">${escHtml(e.date)}</span>
          <span class="import-result-cat">${escHtml(e.category)}</span>
          <span class="import-result-amt">−${fmt(e.amount)} ${escHtml(e.currency)}</span>
        </div>`).join('');
  } else {
    listEl.classList.remove('has-items');
    listEl.innerHTML = '';
  }

  document.getElementById('import-overlay').classList.add('active');
}

/* Show a simple error in the overlay. */
function showImportError(msg) {
  document.getElementById('import-modal-icon').textContent  = '✕';
  document.getElementById('import-modal-icon').className    = 'import-modal-icon error';
  document.getElementById('import-modal-title').textContent = t('importError');

  document.getElementById('import-stats').innerHTML = `
    <div class="import-stat" style="flex:1">
      <div class="import-stat-value" style="font-size:13px;font-weight:500;color:var(--color-red)">
        ${escHtml(msg)}
      </div>
    </div>`;

  document.getElementById('import-result-list').classList.remove('has-items');
  document.getElementById('import-result-list').innerHTML = '';
  document.getElementById('import-overlay').classList.add('active');
}

/* Close overlay by clicking the backdrop (but not the modal itself). */
function closeImportOverlay(event) {
  if (event.target === document.getElementById('import-overlay')) {
    document.getElementById('import-overlay').classList.remove('active');
  }
}

/* Close overlay via the OK button and refresh data. */
async function closeImportOverlayOk() {
  document.getElementById('import-overlay').classList.remove('active');
  try {
    const tstamp = Date.now();
    let res;
    try {
      res = await fetch('api/data.php?' + tstamp);
      if (!res.ok) throw new Error();
    } catch (_) {
      try {
        res = await fetch('index.php?api=data&t=' + tstamp);
        if (!res.ok) throw new Error();
      } catch (_) {
        res = await fetch('data.json?' + tstamp);
      }
    }
    allData = await res.json();
    allData.sort((a, b) => b.date.localeCompare(a.date));
    renderSidebar();
    renderContent();
  } catch (_) { /* silently ignore */ }
}

// ════════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════════
function renderOverview() {
  const grandTotal  = sumAmount(allData);
  const byCat       = groupByCategory(allData);
  const byMonth     = groupByMonth(allData);
  const monthKeys   = Object.keys(byMonth).sort();

  const cats = Object.entries(byCat)
    .map(([cat, entries]) => ({ cat, total: sumAmount(entries), count: entries.length }))
    .sort((a, b) => b.total - a.total);

  document.getElementById('page-title').textContent = t('overview');
  document.getElementById('page-meta').textContent  =
    `${t('txCount', allData.length)} · ${t('monthsCountShort', monthKeys.length)}`;

  // Summary cards
  const avgMonthly      = grandTotal / (monthKeys.length || 1);
  const biggestTx       = allData.reduce((mx, e) => e.amount > mx.amount ? e : mx, allData[0] || { amount: 0, category: '', date: '' });

  let html = `
  <div class="summary-cards">
    <div class="summary-card accent">
      <div class="summary-card-label">${t('allTimeTotal')}</div>
      <div class="summary-card-value">${fmt(Math.round(grandTotal))}</div>
      <div class="summary-card-sub">${getCurrencySymbol()} · ${t('txCount', allData.length)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('avgMonthly')}</div>
      <div class="summary-card-value">${fmt(Math.round(avgMonthly))}</div>
      <div class="summary-card-sub">${getCurrencySymbol()} · ${t('monthsCountShort', monthKeys.length)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('categoriesTitle')}</div>
      <div class="summary-card-value">${cats.length}</div>
      <div class="summary-card-sub">${t('uniqueArticles')}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('maxTx')}</div>
      <div class="summary-card-value" style="font-size:20px">${fmt(biggestTx.amount)}</div>
      <div class="summary-card-sub">${escHtml(biggestTx.category)} · ${biggestTx.date ? dateLabel(biggestTx.date) : ''}</div>
    </div>
  </div>`;

  // Heatmap
  const byDate = {};
  for (const e of allData) { byDate[e.date] = (byDate[e.date] || 0) + e.amount; }
  html += buildHeatmap(byDate);

  // Two-column: leaderboard + top transactions
  html += `<div class="overview-two-col">`;
  html += buildLeaderboard(cats, grandTotal);
  html += buildTopTransactions();
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// HEATMAP
// ════════════════════════════════════════════════════════════
function buildHeatmap(byDate) {
  const CELL = 13, GAP = 3, STEP = CELL + GAP;  // 16px per column

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start ~13 months ago on a Monday
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 13);
  const startDow = (startDate.getDay() + 6) % 7;   // Mon=0 … Sun=6
  startDate.setDate(startDate.getDate() - startDow);

  // Build week array
  const weeks = [];
  const cur   = new Date(startDate);
  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().split('T')[0];
      week.push({ date: dateStr, amount: byDate[dateStr] || 0, future: cur > today });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Color scale
  const vals   = Object.values(byDate).filter(v => v > 0);
  const maxAmt = vals.length ? Math.max(...vals) : 1;
  function cellColor(amount) {
    if (!amount) return '#eef2ff';
    const r = amount / maxAmt;
    if (r < 0.15) return '#c7d2fe';
    if (r < 0.35) return '#a5b4fc';
    if (r < 0.60) return '#6366f1';
    if (r < 0.80) return '#4f46e5';
    return '#3730a3';
  }

  // Month labels (absolute positioning over the weeks row)
  let prevMonth = '';
  let monthsHtml = `<div class="heatmap-months" style="width:${weeks.length * STEP}px">`;
  const monthsShortArr = (I18N[currentLang] || I18N.ru).monthsShort;
  for (let i = 0; i < weeks.length; i++) {
    const mStr = weeks[i][0].date.slice(0, 7);
    if (mStr !== prevMonth) {
      const label = monthsShortArr[+mStr.split('-')[1] - 1];
      monthsHtml += `<span class="heatmap-month-label" style="left:${i * STEP}px">${label}</span>`;
      prevMonth = mStr;
    }
  }
  monthsHtml += `</div>`;

  // Weeks
  let weeksHtml = `<div class="heatmap-weeks">`;
  for (const week of weeks) {
    weeksHtml += `<div class="heatmap-week">`;
    for (const day of week) {
      if (day.future) {
        weeksHtml += `<div class="heatmap-cell" style="background:transparent;border:1px dashed var(--color-border)"></div>`;
      } else {
        const bg    = cellColor(day.amount);
        const title = day.amount
          ? `${day.date}: −${fmtAmt(day.amount)}`
          : `${day.date}: ${t('noExpenses')}`;
        weeksHtml += `<div class="heatmap-cell" style="background:${bg}" title="${title}" onclick="heatmapDayClick('${day.date}')"></div>`;
      }
    }
    weeksHtml += `</div>`;
  }
  weeksHtml += `</div>`;

  // Day labels column
  const dayLabels = (I18N[currentLang] || I18N.ru).dayLabels;
  const dayColHtml = `<div class="heatmap-day-col">` +
    dayLabels.map(l => `<div class="heatmap-day-label">${l}</div>`).join('') +
    `</div>`;

  // Legend
  const LEGEND_COLORS = ['#eef2ff','#c7d2fe','#a5b4fc','#6366f1','#4f46e5','#3730a3'];
  const legendHtml = `
  <div class="heatmap-legend">
    <span>${t('less')}</span>
    ${LEGEND_COLORS.map(c => `<div class="heatmap-cell" style="background:${c}"></div>`).join('')}
    <span>${t('more')}</span>
  </div>`;

  return `
  <div class="card">
    <div class="section-title" style="margin-bottom:16px">
      ${t('heatmapTitle')}
      <span class="chip chip-neutral" style="margin-left:8px">${t('last13Months')}</span>
    </div>
    <div class="heatmap-wrap">
      ${dayColHtml}
      <div class="heatmap-scroll">
        ${monthsHtml}
        ${weeksHtml}
      </div>
    </div>
    ${legendHtml}
  </div>`;
}

// Clicking a heatmap day jumps to that month view
function heatmapDayClick(date) {
  const mk = date.slice(0, 7);
  const byMonth = groupByMonth(allData);
  if (!byMonth[mk]) return;
  switchMode('months');
  selected = mk;
  renderSidebar();
  renderContent();
}

// ════════════════════════════════════════════════════════════
// TOP-5 LEADERBOARD
// ════════════════════════════════════════════════════════════
function buildLeaderboard(cats, grandTotal) {
  const top5 = cats.slice(0, 5);
  const RANK_CLASSES = ['rank-gold','rank-silver','rank-bronze','',''];

  let rows = '';
  for (let i = 0; i < top5.length; i++) {
    const { cat, total, count } = top5[i];
    const pct   = grandTotal > 0 ? (total / grandTotal * 100) : 0;
    const color = catColor(cat);

    rows += `
    <div class="lb-item" title="${t('clickToView')}" onclick="goToCategory('${escAttr(cat)}')" style="cursor:pointer">
      <div class="lb-rank ${RANK_CLASSES[i]}">${i + 1}</div>
      <div class="lb-dot" style="background:${color}"></div>
      <div class="lb-name">${escHtml(cat)}</div>
      <div class="lb-bar-track">
        <div class="lb-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}30;border-right:3px solid ${color}"></div>
      </div>
      <div class="lb-pct" style="color:${color}">${pct.toFixed(1)}%</div>
      <div class="lb-total">${fmt(Math.round(total))}</div>
    </div>`;
  }

  const top5Total  = top5.reduce((s, c) => s + c.total, 0);
  const otherTotal = grandTotal - top5Total;
  const otherPct   = grandTotal > 0 ? (otherTotal / grandTotal * 100).toFixed(1) : 0;

  return `
  <div class="card">
    <div class="section-title" style="margin-bottom:16px">
      ${t('top5Cats')}
      <span class="chip chip-neutral" style="margin-left:8px">${t('allTime')}</span>
    </div>
    <div class="leaderboard">
      ${rows}
      <div class="lb-other">
        <span>${t('otherCats', Math.max(0, cats.length - 5))}</span>
        <span>${otherPct}% · ${fmt(Math.round(otherTotal))} ${getCurrencySymbol()}</span>
      </div>
    </div>
  </div>`;
}

function goToCategory(cat) {
  switchMode('categories');
  selected = cat;
  renderSidebar();
  renderContent();
}

// ════════════════════════════════════════════════════════════
// TOP-8 BIGGEST TRANSACTIONS
// ════════════════════════════════════════════════════════════
function buildTopTransactions() {
  const top = allData.slice().sort((a, b) => b.amount - a.amount).slice(0, 8);

  const rows = top.map((e, i) => {
    const color = catColor(e.category);
    const note  = [e.comment, e.payee].filter(Boolean).join(' · ');
    return `
    <div class="tt-item">
      <div class="tt-rank">${i + 1}</div>
      <div class="tt-body">
        <div class="tt-cat">
          <div class="tt-dot" style="background:${color}"></div>
          ${escHtml(e.category)}
        </div>
        <div class="tt-meta">${dateLabel(e.date)}${note ? ' · ' + escHtml(note) : ''}</div>
      </div>
      <div class="tt-amount">−${fmtAmt(e.amount)}</div>
    </div>`;
  }).join('');

  return `
  <div class="card">
    <div class="section-title" style="margin-bottom:16px">
      ${t('topTxTitle')}
      <span class="chip chip-neutral" style="margin-left:8px">${t('top8')}</span>
    </div>
    <div class="top-transactions">${rows}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
// MONTH VIEW
// ════════════════════════════════════════════════════════════
function renderMonthView() {
  const byMonth = groupByMonth(allData);
  const entries = (byMonth[selected] || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const total   = sumAmount(entries);
  const byCat   = groupByCategory(entries);
  const cats    = Object.keys(byCat).sort((a, b) => sumAmount(byCat[b]) - sumAmount(byCat[a]));

  document.getElementById('page-title').textContent = monthLabel(selected);
  document.getElementById('page-meta').textContent  = `${t('txCount', entries.length)} · ${fmtAmt(total)}`;

  const avgPerDay = (() => {
    const days = new Set(entries.map(e => e.date)).size;
    return days ? total / days : 0;
  })();
  const topCat = cats[0] || '—';
  const topAmt = cats[0] ? sumAmount(byCat[cats[0]]) : 0;

  let html = `
  <div class="summary-cards">
    <div class="summary-card accent">
      <div class="summary-card-label">${t('monthlyTotal')}</div>
      <div class="summary-card-value">${fmt(Math.round(total))}</div>
      <div class="summary-card-sub">${getCurrencySymbol()} · ${t('txCount', entries.length)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('avgPerDay')}</div>
      <div class="summary-card-value">${fmt(Math.round(avgPerDay))}</div>
      <div class="summary-card-sub">${getCurrencySymbol()}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('topCat')}</div>
      <div class="summary-card-value" style="font-size:18px;line-height:1.3">${escHtml(topCat)}</div>
      <div class="summary-card-sub">${fmtAmt(topAmt)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('categoriesTitle')}</div>
      <div class="summary-card-value">${cats.length}</div>
      <div class="summary-card-sub">${t('uniqueCount')}</div>
    </div>
  </div>

  <div class="chart-bar-section">
    <div class="section-title">${t('catDistribution')}</div>
    <div class="chart-bars">`;

  for (const cat of cats) {
    const amt  = sumAmount(byCat[cat]);
    const pct  = total > 0 ? (amt / total * 100) : 0;
    const color = catColor(cat);
    html += `
      <div class="chart-bar-item">
        <div class="chart-bar-label">${escHtml(cat)}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
        </div>
        <div class="chart-bar-value">${fmt(Math.round(amt))}</div>
      </div>`;
  }
  html += `</div></div><div class="category-list">`;

  for (const cat of cats) {
    const items = byCat[cat].slice().sort((a, b) => b.date.localeCompare(a.date));
    const amt   = sumAmount(items);
    const pct   = total > 0 ? (amt / total * 100) : 0;
    const color = catColor(cat);
    const id    = 'cat-' + safeId(cat);
    html += `
    <div class="category-item" id="${id}">
      <div class="category-header" onclick="toggleAccordion('${id}')">
        <div class="category-color-dot" style="background:${color}"></div>
        <div class="category-name">${escHtml(cat)}</div>
        <span class="category-count">${items.length}</span>
        <div class="category-total">−${fmtAmt(amt)}</div>
        <svg class="category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="category-bar-wrap">
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
        </div>
      </div>
      <div class="entries-body">${renderEntriesTable(items)}</div>
    </div>`;
  }
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// CATEGORY VIEW
// ════════════════════════════════════════════════════════════
function renderCategoryView() {
  const byCat    = groupByCategory(allData);
  const entries  = (byCat[selected] || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const total    = sumAmount(entries);
  const grandTotal = sumAmount(allData);
  const pct      = grandTotal > 0 ? (total / grandTotal * 100).toFixed(1) : 0;
  const color    = catColor(selected);
  const byMonth  = groupByMonth(entries);
  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  document.getElementById('page-title').textContent = selected;
  document.getElementById('page-meta').textContent  = `${t('txCount', entries.length)} · ${fmtAmt(total)}`;

  let html = `
  <div class="summary-cards">
    <div class="summary-card accent">
      <div class="summary-card-label">${t('totalByCat')}</div>
      <div class="summary-card-value">${fmt(Math.round(total))}</div>
      <div class="summary-card-sub">${getCurrencySymbol()} · ${t('txCount', entries.length)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('shareOfTotal')}</div>
      <div class="summary-card-value">${pct}%</div>
      <div class="summary-card-sub">${t('fromGrandTotal', fmtAmt(grandTotal))}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('monthsWithExpenses')}</div>
      <div class="summary-card-value">${monthKeys.length}</div>
      <div class="summary-card-sub">${t('monthsUnit')}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('avgCheck')}</div>
      <div class="summary-card-value">${entries.length ? fmt(Math.round(total / entries.length)) : 0}</div>
      <div class="summary-card-sub">${getCurrencySymbol()} ${t('perTx')}</div>
    </div>
  </div>

  <div class="chart-bar-section">
    <div class="section-title">${t('byMonthsTitle')}</div>
    <div class="chart-bars">`;

  const maxMonthAmt = Math.max(...monthKeys.map(k => sumAmount(byMonth[k])));
  for (const k of monthKeys) {
    const amt = sumAmount(byMonth[k]);
    const p   = maxMonthAmt > 0 ? (amt / maxMonthAmt * 100) : 0;
    html += `
      <div class="chart-bar-item">
        <div class="chart-bar-label">${monthLabel(k)}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${p.toFixed(1)}%;background:${color}"></div>
        </div>
        <div class="chart-bar-value">${fmt(Math.round(amt))}</div>
      </div>`;
  }
  html += `</div></div><div class="month-timeline">`;

  for (const k of monthKeys) {
    const items = byMonth[k].slice().sort((a, b) => b.date.localeCompare(a.date));
    const amt   = sumAmount(items);
    const mid   = 'month-' + k.replace('-', '');
    html += `
    <div class="month-block" id="${mid}">
      <div class="month-block-header" onclick="toggleAccordion('${mid}')">
        <div class="category-color-dot" style="background:${color}"></div>
        <div class="month-block-name">${monthLabel(k)}</div>
        <span class="month-block-count">${items.length}</span>
        <div class="month-block-total">−${fmtAmt(amt)}</div>
        <svg class="month-block-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="month-block-entries">${renderEntriesTable(items)}</div>
    </div>`;
  }
  html += `</div>`;

  document.getElementById('content').innerHTML = html;
}

// ── Entries table ─────────────────────────────────────────────
function renderEntriesTable(items) {
  if (!items.length) return `<p style="padding:16px 20px;color:var(--color-text-3)">${t('noData')}</p>`;
  let html = `<table class="entries-table">
    <thead><tr>
      <th>${t('dateCol')}</th>
      <th>${t('commentCol')}</th>
      <th style="text-align:right">${t('amountCol')}</th>
    </tr></thead><tbody>`;
  for (const e of items) {
    const note = [e.payee, e.comment].filter(Boolean).join(' · ') || '—';
    html += `<tr>
      <td class="td-date">${dateLabel(e.date)}</td>
      <td class="td-comment" title="${escAttr(note)}">${escHtml(note)}</td>
      <td class="td-amount">−${fmtAmt(e.amount)}</td>
    </tr>`;
  }
  return html + `</tbody></table>`;
}

// ── Accordion ─────────────────────────────────────────────────
function toggleAccordion(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ── Helpers ───────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return escHtml(s); }
function safeId(s)  { return btoa(encodeURIComponent(s)).replace(/[^a-z0-9]/gi,''); }

// ── Start ─────────────────────────────────────────────────────
init();
