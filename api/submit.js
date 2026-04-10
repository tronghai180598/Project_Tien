/**
 * POST /api/submit — save participant JSON to Google Sheet (recommended) or legacy backends.
 *
 * RECOMMENDED (reliable, no Apps Script):
 *   GOOGLE_SHEET_ID          = id from Sheet URL (between /d/ and /edit)
 *   GOOGLE_SERVICE_ACCOUNT_B64 = base64 of the JSON key file (see google-apps-script/HUONG-DAN-SHEETS-API.txt)
 *
 * OPTIONAL (often flaky):
 *   GOOGLE_SCRIPT_URL        = Apps Script web app URL
 *
 * OPTIONAL:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

const { google } = require("googleapis");

function getServiceAccountCredentials() {
  var b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (b64 && String(b64).trim()) {
    try {
      return JSON.parse(Buffer.from(String(b64).trim(), "base64").toString("utf8"));
    } catch (e) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_B64 (must be base64 of JSON key file)");
    }
  }
  var raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw && String(raw).trim()) {
    try {
      return JSON.parse(String(raw).trim());
    } catch (e) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
    }
  }
  return null;
}

async function appendRowViaSheetsApi(body) {
  var creds = getServiceAccountCredentials();
  var spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!creds || !spreadsheetId || !String(spreadsheetId).trim()) {
    return false;
  }

  var auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  var sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  var meta = await sheets.spreadsheets.get({
    spreadsheetId: String(spreadsheetId).trim()
  });
  var firstSheet = meta.data.sheets[0];
  if (!firstSheet) {
    throw new Error("Spreadsheet has no sheets");
  }
  var title = firstSheet.properties.title;
  var esc = String(title).replace(/'/g, "''");
  var prefix = "'" + esc + "'!";

  var a1 = await sheets.spreadsheets.values.get({
    spreadsheetId: String(spreadsheetId).trim(),
    range: prefix + "A1"
  });
  var firstCell = a1.data.values && a1.data.values[0] && a1.data.values[0][0];
  if (firstCell === undefined || firstCell === null || String(firstCell).trim() === "") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: String(spreadsheetId).trim(),
      range: prefix + "A1:C1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["timestamp", "participant_id", "payload_json"]]
      }
    });
  }

  var pid = body.participantId != null ? String(body.participantId) : "";
  var jsonStr = JSON.stringify(body);
  var row = [new Date().toISOString(), pid, jsonStr];

  await sheets.spreadsheets.values.append({
    spreadsheetId: String(spreadsheetId).trim(),
    range: prefix + "A:C",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] }
  });
  return true;
}

async function fetchGoogleAppsScriptPost(url, bodyObj) {
  var payload = JSON.stringify(bodyObj);
  var headers = { "Content-Type": "application/json" };
  var nextUrl = url;
  var max = 8;
  while (max-- > 0) {
    var r = await fetch(nextUrl, {
      method: "POST",
      headers: headers,
      body: payload,
      redirect: "manual"
    });
    if (r.status >= 300 && r.status < 400) {
      var loc = r.headers.get("location");
      if (loc) {
        nextUrl = new URL(loc, nextUrl).href;
        continue;
      }
    }
    return r;
  }
  throw new Error("Too many redirects to Google Apps Script");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Expected JSON object" });
  }

  var hasSheetsApi =
    process.env.GOOGLE_SHEET_ID &&
    String(process.env.GOOGLE_SHEET_ID).trim() &&
    (process.env.GOOGLE_SERVICE_ACCOUNT_B64 || process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  if (hasSheetsApi) {
    try {
      await appendRowViaSheetsApi(body);
      return res.status(200).json({ ok: true, storage: "google_sheets_api" });
    } catch (err) {
      return res.status(502).json({
        error: "Google Sheets API failed",
        message: err && err.message ? err.message : String(err)
      });
    }
  }

  var gasUrl = process.env.GOOGLE_SCRIPT_URL;
  if (gasUrl && String(gasUrl).trim()) {
    try {
      var r = await fetchGoogleAppsScriptPost(String(gasUrl).trim(), body);
      var text = await r.text();
      if (!r.ok) {
        return res.status(502).json({
          error: "Google Apps Script returned an error",
          status: r.status,
          detail: text.slice(0, 800)
        });
      }
      try {
        var parsed = JSON.parse(text);
        if (parsed && parsed.ok === false) {
          return res.status(502).json({
            error: "Google Apps Script reported failure",
            detail: (parsed.error || text).slice(0, 800)
          });
        }
      } catch (parseErr) {}
      return res.status(200).json({ ok: true, storage: "google_apps_script" });
    } catch (err) {
      return res.status(500).json({
        error: "Failed to reach Google Apps Script",
        message: err && err.message ? err.message : String(err)
      });
    }
  }

  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    var participantId =
      body.participantId != null ? String(body.participantId) : null;
    var row = {
      participant_id: participantId,
      payload: body
    };
    try {
      var r2 = await fetch(url.replace(/\/$/, "") + "/rest/v1/experiment_submissions", {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(row)
      });
      if (!r2.ok) {
        var detail = await r2.text();
        return res.status(502).json({
          error: "Supabase insert failed",
          status: r2.status,
          detail: detail.slice(0, 500)
        });
      }
      return res.status(200).json({ ok: true, storage: "supabase" });
    } catch (err2) {
      return res.status(500).json({
        error: "Supabase request failed",
        message: err2 && err2.message ? err2.message : String(err2)
      });
    }
  }

  return res.status(503).json({
    error: "Storage not configured",
    hint:
      "Set GOOGLE_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_B64 (see HUONG-DAN-SHEETS-API.txt), or GOOGLE_SCRIPT_URL, or Supabase."
  });
};
