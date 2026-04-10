/**
 * GET /api/export — list all submissions (admin only).
 *
 * Header: x-admin-secret: <ADMIN_SECRET>
 * Query: limit (default 5000, max 10000)
 *
 * Env:
 *   ADMIN_SECRET=<long random string>
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-admin-secret, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(503).json({
      error: "ADMIN_SECRET not configured",
      hint: "Set ADMIN_SECRET in Vercel environment variables."
    });
  }

  var provided = String(
    req.headers["x-admin-secret"] ||
      req.headers["X-Admin-Secret"] ||
      (req.query && req.query.secret) ||
      ""
  );
  if (provided !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: "Supabase not configured" });
  }

  var lim = parseInt(req.query && req.query.limit, 10);
  if (!isFinite(lim) || lim < 1) lim = 5000;
  lim = Math.min(lim, 10000);

  try {
    var base = url.replace(/\/$/, "");
    var qs =
      "select=id,inserted_at,participant_id,payload&order=inserted_at.asc&limit=" +
      lim;
    var r = await fetch(base + "/rest/v1/experiment_submissions?" + qs, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      }
    });

    if (!r.ok) {
      var detail = await r.text();
      return res.status(502).json({
        error: "Supabase query failed",
        status: r.status,
        detail: detail.slice(0, 500)
      });
    }

    var rows = await r.json();
    return res.status(200).json({
      ok: true,
      count: Array.isArray(rows) ? rows.length : 0,
      rows: rows
    });
  } catch (err) {
    return res.status(500).json({
      error: "Request failed",
      message: err && err.message ? err.message : String(err)
    });
  }
};
