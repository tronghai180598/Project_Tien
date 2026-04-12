/**
 * POST /api/submit — save participant JSON to Supabase only.
 *
 * REQUIRED:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

var supabase = require("./_lib/supabase");

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

  try {
    var cfg = supabase.getSupabaseConfig();
    if (!cfg.url || !cfg.key) {
      return res.status(503).json({
        error: "Storage not configured",
        hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
      });
    }

    var participantId = body.participantId != null ? String(body.participantId) : null;
    var row = {
      participant_id: participantId,
      payload: body
    };

    var r = await fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/experiment_submissions", {
      method: "POST",
      headers: Object.assign({}, supabase.getSupabaseHeaders(cfg.key), {
        Prefer: "return=minimal"
      }),
      body: JSON.stringify(row)
    });

    if (!r.ok) {
      var detail = await r.text();
      return res.status(502).json({
        error: "Supabase insert failed",
        status: r.status,
        detail: detail.slice(0, 500)
      });
    }

    return res.status(200).json({ ok: true, storage: "supabase" });
  } catch (err) {
    return res.status(500).json({
      error: "Request failed",
      message: err && err.message ? err.message : String(err)
    });
  }
};
