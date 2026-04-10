/**
 * Google Sheet: receive POST from your site (via Vercel).
 * Put your Sheet ID from the URL between /d/ and /edit into SPREADSHEET_ID below.
 * After edits: Deploy - Manage deployments - New version - Deploy.
 */

var SPREADSHEET_ID = "";

function getTargetSheet_() {
  var id = String(SPREADSHEET_ID || "").trim();
  if (!id) {
    throw new Error("Set SPREADSHEET_ID in Code.gs (copy from Sheet URL).");
  }
  var ss = SpreadsheetApp.openById(id);
  return ss.getSheets()[0];
}

function doPost(e) {
  try {
    var sheet = getTargetSheet_();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "participant_id", "payload_json"]);
    }
    var raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    var data = JSON.parse(raw);
    var pid = data.participantId != null ? String(data.participantId) : "";
    var jsonStr = JSON.stringify(data);
    sheet.appendRow([new Date(), pid, jsonStr]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "POST JSON only. Set SPREADSHEET_ID. Use GOOGLE_SCRIPT_URL on Vercel."
  ).setMimeType(ContentService.MimeType.TEXT);
}

function testAppendRow() {
  var sheet = getTargetSheet_();
  var testJson = JSON.stringify({ test: true });
  sheet.appendRow([new Date(), "TEST_MANUAL", testJson]);
}
