/**
 * POST /api/submit — forwards participant JSON to your Google Apps Script Web App,
 * which appends one row per submission to a Google Sheet.
 *
 * Vercel → Environment Variables:
 *   GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
 *
 * (Optional legacy: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to use Supabase instead.)
 */

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

  var gasUrl = process.env.GOOGLE_SCRIPT_URL;
  if (gasUrl && String(gasUrl).trim()) {
    try {
      var r = await fetch(String(gasUrl).trim(), {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      var text = await r.text();
      if (!r.ok) {
        return res.status(502).json({
          error: "Google Apps Script returned an error",
          status: r.status,
          detail: text.slice(0, 800)
        });
      }
      return res.status(200).json({ ok: true, storage: "google_sheet" });
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
      "Set GOOGLE_SCRIPT_URL in Vercel (Google Sheet — see google-apps-script/Code.gs), or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
  });
};
