var supabase = require("./_lib/supabase");
var exporter = require("./_lib/experiment-export");

function asBool(v, defaultValue) {
  if (v == null || v === "") return defaultValue;
  var s = String(v).toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return defaultValue;
}

function checkResearchToken(req, res) {
  var required = process.env.RESEARCH_DASHBOARD_TOKEN;
  if (!required) return true;

  var queryToken = req.query && req.query.token ? String(req.query.token) : "";
  var headerToken = req.headers && req.headers["x-research-token"] ? String(req.headers["x-research-token"]) : "";
  var token = queryToken || headerToken;

  if (token && token === required) return true;

  res.status(401).json({
    error: "Unauthorized",
    hint: "Set token query (?token=...) or x-research-token header."
  });
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-research-token");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkResearchToken(req, res)) return;

  var dedupe = asBool(req.query && req.query.dedupe, true);

  try {
    var dbRows = await supabase.fetchAllSubmissions();
    var bundles = exporter.buildBundlesFromDbRows(dbRows, { dedupeByParticipant: dedupe });
    var rows = bundles.map(exporter.flattenBundle);
    var columns = exporter.buildColumns(rows);

    return res.status(200).json({
      ok: true,
      dedupe_by_participant: dedupe,
      source_rows: dbRows.length,
      total_rows: rows.length,
      columns: columns,
      rows: rows,
      bundles: bundles
    });
  } catch (err) {
    if (err && err.code === "STORAGE_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "Storage not configured",
        hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
      });
    }

    return res.status(500).json({
      error: "Failed to load submissions",
      message: err && err.message ? err.message : String(err),
      detail: err && err.detail ? err.detail : undefined,
      status: err && err.status ? err.status : undefined
    });
  }
};
