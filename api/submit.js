/**
 * POST /api/submit — store one participant JSON bundle in Supabase.
 *
 * Supabase SQL (run in SQL editor once):
 *
 * create table if not exists experiment_submissions (
 *   id uuid default gen_random_uuid() primary key,
 *   inserted_at timestamptz not null default now(),
 *   participant_id text,
 *   payload jsonb not null
 * );
 * create index if not exists experiment_submissions_inserted_at_idx
 *   on experiment_submissions (inserted_at desc);
 *
 * Env (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...  (service role, never expose to browser)
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

  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).json({
      error: "Server storage not configured",
      hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel."
    });
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

  var participantId =
    body.participantId != null ? String(body.participantId) : null;

  var row = {
    participant_id: participantId,
    payload: body
  };

  try {
    var r = await fetch(url.replace(/\/$/, "") + "/rest/v1/experiment_submissions", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
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

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      error: "Request failed",
      message: err && err.message ? err.message : String(err)
    });
  }
};
