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

/**
 * Delete all rows in experiment_submissions (service role only).
 */
async function deleteAllSubmissions() {
  var cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.key) {
    var e = new Error("Storage not configured");
    e.code = "STORAGE_NOT_CONFIGURED";
    throw e;
  }
  var base = cfg.url.replace(/\/$/, "") + "/rest/v1/experiment_submissions";
  var delHeaders = Object.assign({}, getSupabaseHeaders(cfg.key), {
    Prefer: "return=minimal"
  });

  var r = await fetch(base + "?id=not.is.null", {
    method: "DELETE",
    headers: delHeaders
  });
  if (r.ok) return true;

  var rows = await fetchAllSubmissions();
  if (!rows.length) return true;

  var BATCH = 80;
  for (var i = 0; i < rows.length; i += BATCH) {
    var chunk = rows.slice(i, i + BATCH);
    var ids = chunk
      .map(function (row) {
        return row.id;
      })
      .filter(function (x) {
        return x != null;
      });
    if (!ids.length) continue;
    var inList = ids
      .map(function (id) {
        return encodeURIComponent(id);
      })
      .join(",");
    var r2 = await fetch(base + "?id=in.(" + inList + ")", {
      method: "DELETE",
      headers: delHeaders
    });
    if (!r2.ok) {
      var detail = await r2.text();
      var err = new Error("Supabase delete failed: HTTP " + r2.status);
      err.status = r2.status;
      err.detail = detail.slice(0, 500);
      throw err;
    }
  }
  return true;
}

module.exports = {
  fetchAllSubmissions: fetchAllSubmissions,
  deleteAllSubmissions: deleteAllSubmissions,
  getSupabaseConfig: getSupabaseConfig,
  getSupabaseHeaders: getSupabaseHeaders
};
