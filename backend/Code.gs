/**
 * POONDU LEDGER — Google Apps Script backend
 * ============================================
 * Architecture notes (read this before editing):
 *
 * 1. SPREADSHEET_ID is set explicitly below. We NEVER rely on
 *    getActiveSpreadsheet() because this script may be deployed as a
 *    standalone project, where there is no "active" spreadsheet context
 *    when doGet/doPost run. openById() works regardless of how the
 *    script project is bound. THIS WAS THE MAIN BUG — sheets were
 *    silently never being created because getActiveSpreadsheet()
 *    returned null and threw, and the client was using no-cors mode,
 *    which hides all errors from the browser.
 *
 * 2. Sales / Expenses / Lots are APPEND-ONLY ledgers. The client sends
 *    one new record at a time (action: addSale / addExpense / addLot),
 *    we append a single row. This means:
 *      - Saves are fast even with thousands of rows
 *      - A failed save can't corrupt existing data
 *      - You can build Pivot Tables / QUERY() formulas directly on
 *        these sheets for ad-hoc reporting without touching code
 *
 * 3. Config / Partners are small "current state" tables — fully
 *    overwritten on save, which is fine since they're a handful of rows.
 *
 * 4. Edits/deletes (e.g. correcting a lot's kg) use explicit
 *    updateLots / deleteRow actions that touch only the relevant sheet.
 *
 * 5. LockService prevents two partners saving at the exact same moment
 *    from corrupting each other's write.
 *
 * 6. A Log sheet records every write for auditing/debugging — if a
 *    partner says "my sale didn't save," you can check this sheet.
 *
 * 7. doGet supports ?action=report&period=daily|weekly|monthly|quarterly
 *    for pre-aggregated numbers, in addition to the full raw sync used
 *    to hydrate the app on load.
 */

var SPREADSHEET_ID = '1LUGAEclAgBU2H3KJhYPBlm8mTlIKy32gTA_b0z2ywlc';

var SHEET_HEADERS = {
  Config:   ['Parameter', 'Value'],
  Partners: ['Partner', 'Required', 'Contributed'],
  Lots:     ['ID', 'Label', 'Bags', 'KG', 'Cost', 'Date Added'],
  Sales:    ['ID', 'Date', 'Lot ID', 'Channel', 'Bags', 'KG', 'Amount', 'Note'],
  Expenses: ['ID', 'Date', 'Description', 'Amount'],
  Log:      ['Timestamp', 'Action', 'Detail']
};

function getSS_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(SHEET_HEADERS[name]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logAction_(ss, action, detail) {
  try {
    var sh = getOrCreateSheet_(ss, 'Log');
    sh.appendRow([new Date(), action, detail]);
  } catch (e) {
    // logging must never break the main operation
  }
}

// ---------- row builders ----------
function rowFromLot_(l) {
  return [l.id, l.label, Number(l.bags) || 0, Number(l.kg) || 0, Number(l.cost) || 0, l.dateAdded || ''];
}
function rowFromSale_(s) {
  return [s.id, s.date, s.lotId, s.channel, Number(s.bags) || 0, Number(s.kg) || 0, Number(s.amount) || 0, s.note || ''];
}
function rowFromExpense_(x) {
  return [x.id, x.date, x.desc, Number(x.amount) || 0];
}

// ---------- generic helpers ----------
function appendRow_(ss, sheetName, row) {
  var sh = getOrCreateSheet_(ss, sheetName);
  sh.appendRow(row);
  return { sheet: sheetName, rows: sh.getLastRow() - 1 };
}

function overwriteSheet_(ss, sheetName, rows) {
  var sh = getOrCreateSheet_(ss, sheetName);
  sh.clearContents();
  sh.appendRow(SHEET_HEADERS[sheetName]);
  rows.forEach(function (r) { sh.appendRow(r); });
  return { sheet: sheetName, rows: rows.length };
}

function deleteRowById_(ss, sheetName, id) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return { deleted: false };
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { deleted: true, row: i + 1 };
    }
  }
  return { deleted: false };
}

// ================= doPost =================
function doPost(e) {
  var lock = LockService.getScriptLock();
  var gotLock = lock.tryLock(15000);
  if (!gotLock) {
    return jsonOut_({ status: 'error', message: 'Another save is in progress, please retry.' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var ss = getSS_();
    var result;

    switch (action) {
      case 'addLot':
        result = appendRow_(ss, 'Lots', rowFromLot_(body.payload));
        break;
      case 'updateLots':
        result = overwriteSheet_(ss, 'Lots', body.payload.map(rowFromLot_));
        break;
      case 'addSale':
        result = appendRow_(ss, 'Sales', rowFromSale_(body.payload));
        break;
      case 'deleteSale':
        result = deleteRowById_(ss, 'Sales', body.id);
        break;
      case 'addExpense':
        result = appendRow_(ss, 'Expenses', rowFromExpense_(body.payload));
        break;
      case 'deleteExpense':
        result = deleteRowById_(ss, 'Expenses', body.id);
        break;
      case 'updateConfig':
        result = overwriteSheet_(ss, 'Config',
          Object.keys(body.payload).map(function (k) { return [k, body.payload[k]]; }));
        break;
      case 'updatePartners':
        result = overwriteSheet_(ss, 'Partners',
          Object.keys(body.payload).map(function (k) {
            return [k, body.payload[k].required, body.payload[k].contributed];
          }));
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }

    logAction_(ss, action, JSON.stringify(body.payload || body.id || {}).slice(0, 200));
    return jsonOut_({ status: 'success', action: action, result: result });
  } catch (err) {
    return jsonOut_({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ================= doGet =================
function doGet(e) {
  try {
    var action = e.parameter && e.parameter.action;
    var ss = getSS_();

    if (action === 'report') {
      return jsonOut_(buildReport_(ss, e.parameter.period || 'monthly'));
    }

    // default: full raw sync, used to hydrate the app on load
    return jsonOut_(fullSyncPayload_(ss));
  } catch (err) {
    return jsonOut_({ error: err.toString() });
  }
}

function fullSyncPayload_(ss) {
  var data = { config: {}, partners: {}, lots: [], sales: [], expenses: [] };

  var shConfig = ss.getSheetByName('Config');
  if (shConfig) {
    var v = shConfig.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) data.config[v[i][0]] = Number(v[i][1]);
  }

  var shPartners = ss.getSheetByName('Partners');
  if (shPartners) {
    var v2 = shPartners.getDataRange().getValues();
    for (var i = 1; i < v2.length; i++) {
      data.partners[v2[i][0]] = { required: Number(v2[i][1]), contributed: Number(v2[i][2]) };
    }
  }

  var shLots = ss.getSheetByName('Lots');
  if (shLots) {
    var v3 = shLots.getDataRange().getValues();
    for (var i = 1; i < v3.length; i++) {
      data.lots.push({ id: v3[i][0], label: v3[i][1], bags: Number(v3[i][2]), kg: Number(v3[i][3]), cost: Number(v3[i][4]), dateAdded: fmtDate_(v3[i][5]) });
    }
  }

  var shSales = ss.getSheetByName('Sales');
  if (shSales) {
    var v4 = shSales.getDataRange().getValues();
    for (var i = 1; i < v4.length; i++) {
      data.sales.push({ id: v4[i][0], date: fmtDate_(v4[i][1]), lotId: v4[i][2], channel: v4[i][3], bags: Number(v4[i][4]), kg: Number(v4[i][5]), amount: Number(v4[i][6]), note: v4[i][7] });
    }
  }

  var shExpenses = ss.getSheetByName('Expenses');
  if (shExpenses) {
    var v5 = shExpenses.getDataRange().getValues();
    for (var i = 1; i < v5.length; i++) {
      data.expenses.push({ id: v5[i][0], date: fmtDate_(v5[i][1]), desc: v5[i][2], amount: Number(v5[i][3]) });
    }
  }

  return data;
}

function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v;
}

// ---------- reporting ----------
function buildReport_(ss, period) {
  var data = fullSyncPayload_(ss);
  var buckets = {};

  function bucketKey(dateStr) {
    var d = new Date(dateStr);
    if (period === 'daily') return Utilities.formatDate(d, 'GMT', 'yyyy-MM-dd');
    if (period === 'weekly') {
      var onejan = new Date(d.getFullYear(), 0, 1);
      var week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
      return d.getFullYear() + '-W' + week;
    }
    if (period === 'quarterly') return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
    return Utilities.formatDate(d, 'GMT', 'yyyy-MM'); // monthly default
  }

  data.sales.forEach(function (s) {
    var k = bucketKey(s.date);
    buckets[k] = buckets[k] || { period: k, revenue: 0, bags: 0, retailRevenue: 0, wholesaleRevenue: 0, expenses: 0 };
    buckets[k].revenue += s.amount;
    buckets[k].bags += s.bags;
    if (s.channel === 'retail') buckets[k].retailRevenue += s.amount;
    else buckets[k].wholesaleRevenue += s.amount;
  });

  data.expenses.forEach(function (x) {
    var k = bucketKey(x.date);
    buckets[k] = buckets[k] || { period: k, revenue: 0, bags: 0, retailRevenue: 0, wholesaleRevenue: 0, expenses: 0 };
    buckets[k].expenses += x.amount;
  });

  var out = Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
  return { period: period, buckets: out };
}

/**
 * Run this once manually from the Apps Script editor (select
 * setupSheets, click Run) to pre-create all tabs with correct headers
 * before you ever hit the web app from the browser. Also useful to
 * re-run safely any time — it won't wipe existing sheets.
 */
function setupSheets() {
  var ss = getSS_();
  Object.keys(SHEET_HEADERS).forEach(function (name) {
    getOrCreateSheet_(ss, name);
  });
}
