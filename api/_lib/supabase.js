function getSupabaseConfig() {
  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url: url, key: key };
}

function getSupabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  };
}

async function fetchSubmissionPage(url, key, limit, offset) {
  var qs =
    "select=id,inserted_at,participant_id,payload" +
    "&order=inserted_at.asc,id.asc" +
    "&limit=" + encodeURIComponent(limit) +
    "&offset=" + encodeURIComponent(offset);

  var r = await fetch(url.replace(/\/$/, "") + "/rest/v1/experiment_submissions?" + qs, {
    method: "GET",
    headers: getSupabaseHeaders(key)
  });

  if (!r.ok) {
    var detail = await r.text();
    var err = new Error("Supabase read failed: HTTP " + r.status);
    err.status = r.status;
    err.detail = detail.slice(0, 500);
    throw err;
  }

  var rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchAllSubmissions() {
  var cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.key) {
    var e = new Error("Storage not configured");
    e.code = "STORAGE_NOT_CONFIGURED";
    throw e;
  }

  var pageSize = 1000;
  var offset = 0;
  var all = [];

  while (true) {
    var page = await fetchSubmissionPage(cfg.url, cfg.key, pageSize, offset);
    if (!page.length) break;
    Array.prototype.push.apply(all, page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

module.exports = {
  fetchAllSubmissions: fetchAllSubmissions,
  getSupabaseConfig: getSupabaseConfig,
  getSupabaseHeaders: getSupabaseHeaders
};
