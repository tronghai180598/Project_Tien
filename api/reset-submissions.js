/**
 * POST /api/reset-submissions — delete all rows in experiment_submissions (trial / lab use).
 *
 * Auth:
 *   - Same as dashboard: RESEARCH_DASHBOARD_TOKEN via ?token= or x-research-token
 * Body JSON: { "password": "..." }
 * Password: RESEARCH_RESET_PASSWORD env, or default "tien123" if unset (set env in production).
 */

var supabase = require("./_lib/supabase");

function checkResearchToken(req, res) {
  var required = process.env.RESEARCH_DASHBOARD_TOKEN;
  if (!required) return true;

  var queryToken = req.query && req.query.token ? String(req.query.token) : "";
  var headerToken =
    req.headers && req.headers["x-research-token"] ? String(req.headers["x-research-token"]) : "";
  var token = queryToken || headerToken;

  if (token && token === required) return true;

  res.status(401).json({
    error: "Unauthorized",
    hint: "Set token query (?token=...) or x-research-token header."
  });
  return false;
}

function getExpectedResetPassword() {
  var env = process.env.RESEARCH_RESET_PASSWORD;
  if (env != null && String(env).length > 0) return String(env);
  return "tien123";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-research-token");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkResearchToken(req, res)) return;

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

  var password = body.password != null ? String(body.password) : "";
  if (password !== getExpectedResetPassword()) {
    return res.status(403).json({ error: "Invalid password" });
  }

  try {
    await supabase.deleteAllSubmissions();
    return res.status(200).json({ ok: true, deleted: "all" });
  } catch (err) {
    if (err && err.code === "STORAGE_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "Storage not configured",
        hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
      });
    }
    return res.status(500).json({
      error: "Failed to delete submissions",
      message: err && err.message ? err.message : String(err),
      detail: err && err.detail ? err.detail : undefined
    });
  }
};
