/**
 * quotes-daily-check.gs
 *
 * Add this to the SAME Google Apps Script project that already handles quote
 * submissions (the one quote.html POSTs to at .../exec). Then redeploy the
 * EXISTING deployment as a *New version* so the /exec URL stays identical and
 * quote-form submissions keep working.
 *
 * The Windows scheduled task "Densanon Quotes Check" hits this once a day:
 *     GET  .../exec?action=dailycheck&token=<CHECK_TOKEN>
 * It reads the Quotes tab and, if new rows arrived since the last check, emails
 * a summary to NOTIFY_EMAIL. No browser, no Claude, no leaked sessions.
 *
 * Deploy settings (Deploy > Manage deployments > edit existing > New version):
 *   - Execute as: Me
 *   - Who has access: Anyone   (the token below is the access gate)
 *
 * NOTE: if your quote script is a *standalone* script (not bound to the sheet),
 * replace SpreadsheetApp.getActiveSpreadsheet() below with
 * SpreadsheetApp.openById('YOUR_SHEET_ID').
 * If your project already defines doGet(), merge the body — don't add a second one.
 */

var QUOTES_TAB   = 'Quotes';                 // change if your tab is named differently
var NOTIFY_EMAIL = 'densanon@gmail.com';
var CHECK_TOKEN  = '0957d714-25ec-4220-a243-6dfb5fb9331e';   // must match the Windows job

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var token  = (e && e.parameter && e.parameter.token)  || '';
  if (action !== 'dailycheck') return _json({ ok: false, error: 'unknown action' });
  if (token  !== CHECK_TOKEN)  return _json({ ok: false, error: 'bad token' });
  return _json(_quotesDailyCheck());
}

function _quotesDailyCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();     // standalone script? use openById(...)
  var sh = ss.getSheetByName(QUOTES_TAB);
  if (!sh) return { ok: false, error: 'tab "' + QUOTES_TAB + '" not found' };

  var lastRow  = sh.getLastRow();               // includes header row
  var lastCol  = sh.getLastColumn();
  var dataRows = Math.max(0, lastRow - 1);      // minus header

  var props = PropertiesService.getScriptProperties();
  var prev  = props.getProperty('quotesLastNotifiedRows');

  // First run ever: baseline to current so we don't email every historical row.
  if (prev === null) {
    props.setProperty('quotesLastNotifiedRows', String(dataRows));
    return { ok: true, baselined: true, totalRows: dataRows, newRows: 0 };
  }

  var seen = parseInt(prev, 10); if (isNaN(seen)) seen = 0;
  var newCount = dataRows - seen;
  if (newCount <= 0) {
    // Keep the baseline in sync if rows were removed.
    if (dataRows < seen) props.setProperty('quotesLastNotifiedRows', String(dataRows));
    return { ok: true, totalRows: dataRows, newRows: 0 };
  }

  var header   = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var startRow = seen + 2;                       // +1 header, +1 to first new row
  var rows     = sh.getRange(startRow, 1, newCount, lastCol).getValues();

  var body = 'You have ' + newCount + ' new quote submission(s):\n\n';
  for (var i = 0; i < rows.length; i++) {
    body += '--- Quote ' + (i + 1) + ' ---\n';
    for (var c = 0; c < header.length; c++) {
      var key = header[c], val = rows[i][c];
      if ((key === '' || key === null) && (val === '' || val === null)) continue;
      body += (key ? key : ('Col' + (c + 1))) + ': ' + val + '\n';
    }
    body += '\n';
  }
  body += 'Total quotes in sheet: ' + dataRows + '\n';

  MailApp.sendEmail(NOTIFY_EMAIL, 'New quote submission(s): ' + newCount, body);
  props.setProperty('quotesLastNotifiedRows', String(dataRows));
  return { ok: true, totalRows: dataRows, newRows: newCount, notified: true };
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}
