var ASST_N = 20;
var CAQ_N = 24;
var POST_N = 5;
var STROOP_N = 25;
var GNG_MAIN_N = 10;
var SCHULTE_TABLES_N = 5;

function mean(arr) {
  var xs = arr.filter(function (x) {
    return typeof x === "number" && isFinite(x);
  });
  if (!xs.length) return "";
  var s = 0;
  xs.forEach(function (x) {
    s += x;
  });
  return Math.round((s / xs.length) * 100) / 100;
}

function safeNum(x) {
  var n = typeof x === "number" ? x : parseFloat(x);
  return isFinite(n) ? n : null;
}

function normalizeBundle(obj) {
  if (!obj || typeof obj !== "object") return null;
  return obj;
}

function stroopTrialsForStats(rawSt) {
  if (!rawSt) return [];
  if (rawSt.main && Array.isArray(rawSt.main.trials)) return rawSt.main.trials;
  if (Array.isArray(rawSt.trials)) return rawSt.trials;
  return [];
}

function stroopMeanRt(rawSt) {
  var trials = stroopTrialsForStats(rawSt);
  if (!trials.length) return "";
  var rts = trials
    .filter(function (tr) {
      return !tr.timeout && tr.reactionMs != null;
    })
    .map(function (tr) {
      return tr.reactionMs;
    });
  return mean(rts);
}

function flattenBundle(b) {
  var r = {};
  r.server_row_id = b.server_row_id != null ? String(b.server_row_id) : "";
  r.server_inserted_at = b.server_inserted_at != null ? String(b.server_inserted_at) : "";
  r.participant_id = b.participantId || b.user_id || "";
  r.exported_at = b.exportedAt || b.timestamp || "";

  var s1 = b.stage1 || {};
  r.stage1_branch = s1.videoBranch != null ? s1.videoBranch : "";
  r.stage1_shorts_done = s1.allShortsWatched ? "1" : s1.allShortsWatched === false ? "0" : "";
  r.max_unlocked_stage = s1.maxUnlockedStage != null ? String(s1.maxUnlockedStage) : "";

  var s2 = b.stage2;
  r.crt_correct = s2 && s2.wrong_count != null && s2.answers ? 3 - s2.wrong_count : "";
  if (s2 && typeof s2.wrong_count === "number") r.crt_wrong = s2.wrong_count;
  else r.crt_wrong = "";
  for (var q = 1; q <= 3; q++) {
    r["crt_q" + q + "_ms"] = "";
    r["crt_q" + q + "_choice"] = "";
    r["crt_q" + q + "_correct"] = "";
  }
  if (s2 && Array.isArray(s2.answers)) {
    s2.answers.forEach(function (a) {
      var qi = a.q;
      if (qi >= 1 && qi <= 3) {
        r["crt_q" + qi + "_ms"] = a.time_ms != null ? a.time_ms : "";
        r["crt_q" + qi + "_choice"] = a.selected != null ? String(a.selected) : "";
        r["crt_q" + qi + "_correct"] = a.correct ? "1" : a.correct === false ? "0" : "";
      }
    });
  }

  var rawCrt = b._raw && b._raw.crt;
  if (rawCrt && r.crt_correct === "") {
    r.crt_correct = rawCrt.correctCount != null ? rawCrt.correctCount : "";
    r.crt_wrong = rawCrt.wrongCount != null ? rawCrt.wrongCount : "";
  }

  var s4 = b.stage4;
  var rawSt = b._raw && b._raw.stroop;
  if (s4) {
    r.stroop_correct = s4.correct_count != null ? s4.correct_count : "";
    r.stroop_wrong = s4.wrong_count != null ? s4.wrong_count : "";
  } else if (rawSt && rawSt.main) {
    r.stroop_correct = rawSt.main.correctCount != null ? rawSt.main.correctCount : "";
    r.stroop_wrong = rawSt.main.wrongCount != null ? rawSt.main.wrongCount : "";
  } else if (rawSt) {
    r.stroop_correct = rawSt.correctCount != null ? rawSt.correctCount : "";
    r.stroop_wrong = rawSt.wrongCount != null ? rawSt.wrongCount : "";
  } else {
    r.stroop_correct = "";
    r.stroop_wrong = "";
  }
  r.stroop_mean_rt_ms = stroopMeanRt(rawSt);

  for (var si = 1; si <= STROOP_N; si++) {
    r["stroop_t" + si + "_ms"] = "";
  }
  var trials = stroopTrialsForStats(rawSt);
  if ((!trials || trials.length === 0) && s4 && Array.isArray(s4.reaction_times)) {
    trials = s4.reaction_times.map(function (rt) {
      return { reactionMs: rt, timeout: rt == null };
    });
  }
  if (Array.isArray(trials)) {
    trials.forEach(function (tr, idx) {
      if (idx < STROOP_N) {
        r["stroop_t" + (idx + 1) + "_ms"] = tr.timeout || tr.reactionMs == null ? "" : tr.reactionMs;
      }
    });
  }

  var s6 = b.stage6;
  var rawSch = b._raw && b._raw.schulte;
  r.gng_main_correct = "";
  r.gng_main_wrong = "";
  r.gng_mean_rt_ms = "";
  for (var gi = 1; gi <= GNG_MAIN_N; gi++) {
    r["gng_m" + gi + "_digit"] = "";
    r["gng_m" + gi + "_ms"] = "";
    r["gng_m" + gi + "_ok"] = "";
  }
  for (var sti = 1; sti <= SCHULTE_TABLES_N; sti++) {
    r["schulte_t" + sti + "_ms"] = "";
  }
  r.schulte_total_ms = "";
  r.schulte_wrong_clicks = "";
  function fillSchulteFromTables(tablesArr) {
    if (!Array.isArray(tablesArr)) return;
    tablesArr.forEach(function (row, idx) {
      if (idx < SCHULTE_TABLES_N && row && row.durationMs != null) {
        r["schulte_t" + (idx + 1) + "_ms"] = row.durationMs;
      }
    });
  }
  if (s6 && Array.isArray(s6.schulte_table_times_ms)) {
    s6.schulte_table_times_ms.forEach(function (ms, idx) {
      if (idx < SCHULTE_TABLES_N) r["schulte_t" + (idx + 1) + "_ms"] = ms != null ? ms : "";
    });
    r.schulte_total_ms = s6.schulte_total_ms != null ? s6.schulte_total_ms : "";
    r.schulte_wrong_clicks = s6.schulte_wrong_clicks != null ? s6.schulte_wrong_clicks : "";
  } else if (rawSch && Array.isArray(rawSch.tables)) {
    fillSchulteFromTables(rawSch.tables);
    r.schulte_total_ms = rawSch.totalDurationMs != null ? rawSch.totalDurationMs : "";
    r.schulte_wrong_clicks = rawSch.wrongClicksTotal != null ? rawSch.wrongClicksTotal : "";
  }

  var s7 = b.stage7;
  var pay = s7 && s7.answers ? s7.answers : null;
  var fields = (pay && pay.fields) || {};
  r.s7_fio = pay && pay.fio != null ? String(pay.fio) : "";
  r.s7_gender = fields.s7_gender || "";
  r.s7_age = fields.s7_age || "";
  r.s7_edu = fields.s7_edu || "";
  r.s7_course = fields.s7_course || "";
  r.s7_spec = fields.s7_spec || "";
  r.s7_shorts_daily = fields.s7_shorts_daily || "";
  r.s7_short_days = fields.s7_short_days || "";
  r.s7_shorts_study = fields.s7_shorts_study || "";
  r.s7_saved_at = s7 && s7.savedAt ? s7.savedAt : "";

  var preProf = b.pre_stage_profile;
  if (preProf && typeof preProf === "object") {
    if (!String(r.s7_fio || "").trim() && preProf.fio) r.s7_fio = String(preProf.fio);
    if (!String(r.s7_gender || "").trim() && preProf.gender) r.s7_gender = String(preProf.gender);
    if (!String(r.s7_age || "").trim() && preProf.age) r.s7_age = String(preProf.age);
    if (!String(r.s7_spec || "").trim() && preProf.spec) r.s7_spec = String(preProf.spec);
  }

  for (var ai = 1; ai <= ASST_N; ai++) {
    r["s7_asst_" + ai] = pay && pay.asst && pay.asst[String(ai)] != null ? String(pay.asst[String(ai)]) : "";
  }
  for (var pi = 1; pi <= POST_N; pi++) {
    var pk = "s7_post" + pi;
    r["s7_post_" + pi] = fields[pk] != null && fields[pk] !== "" ? String(fields[pk]) : "";
  }
  for (var ci = 1; ci <= CAQ_N; ci++) {
    r["s7_caq_" + ci] = pay && pay.caq && pay.caq[String(ci)] != null ? String(pay.caq[String(ci)]) : "";
  }

  return r;
}

function buildColumns(rows) {
  var set = {};
  rows.forEach(function (row) {
    Object.keys(row).forEach(function (k) {
      set[k] = true;
    });
  });
  var preferred = [
    "server_row_id",
    "server_inserted_at",
    "participant_id",
    "exported_at",
    "stage1_branch",
    "stage1_shorts_done",
    "max_unlocked_stage",
    "crt_correct",
    "crt_wrong",
    "crt_q1_ms",
    "crt_q1_choice",
    "crt_q1_correct",
    "crt_q2_ms",
    "crt_q2_choice",
    "crt_q2_correct",
    "crt_q3_ms",
    "crt_q3_choice",
    "crt_q3_correct",
    "stroop_correct",
    "stroop_wrong",
    "stroop_mean_rt_ms",
    "schulte_t1_ms",
    "schulte_t2_ms",
    "schulte_t3_ms",
    "schulte_t4_ms",
    "schulte_t5_ms",
    "schulte_total_ms",
    "schulte_wrong_clicks"
  ];
  var rest = Object.keys(set).filter(function (k) {
    return preferred.indexOf(k) < 0;
  });
  rest.sort();
  var cols = preferred.filter(function (k) {
    return set[k];
  });
  rest.forEach(function (k) {
    if (set[k]) cols.push(k);
  });
  return cols;
}

function csvEscape(s) {
  var x = s == null ? "" : String(s);
  if (/[",\n\r]/.test(x)) return '"' + x.replace(/"/g, '""') + '"';
  return x;
}

function toCsv(rows, cols) {
  var lines = [cols.map(csvEscape).join(",")];
  rows.forEach(function (row) {
    lines.push(
      cols
        .map(function (c) {
          return csvEscape(row[c]);
        })
        .join(",")
    );
  });
  return lines.join("\r\n");
}

function toBundleFromDbRow(row) {
  var payload = row && row.payload && typeof row.payload === "object" ? row.payload : {};
  var bundle = Object.assign({}, payload);
  if (!bundle.participantId && row && row.participant_id != null) {
    bundle.participantId = String(row.participant_id);
  }
  if (row && row.id != null) bundle.server_row_id = row.id;
  if (row && row.inserted_at != null) bundle.server_inserted_at = row.inserted_at;
  return bundle;
}

function dedupeByParticipant(bundles) {
  var map = {};
  bundles.forEach(function (b) {
    var key = b && b.participantId ? String(b.participantId).trim() : "";
    if (!key) return;
    var prev = map[key];
    if (!prev) {
      map[key] = b;
      return;
    }
    var prevAt = Date.parse(prev.server_inserted_at || prev.exportedAt || 0) || 0;
    var curAt = Date.parse(b.server_inserted_at || b.exportedAt || 0) || 0;
    if (curAt >= prevAt) map[key] = b;
  });
  return Object.keys(map)
    .sort()
    .map(function (k) {
      return map[k];
    });
}

function buildBundlesFromDbRows(dbRows, options) {
  var opts = options || {};
  var dedupe = opts.dedupeByParticipant === true;
  var bundles = (Array.isArray(dbRows) ? dbRows : [])
    .map(toBundleFromDbRow)
    .map(normalizeBundle)
    .filter(Boolean);

  if (dedupe) {
    bundles = dedupeByParticipant(bundles);
  }

  return bundles;
}

function buildFlatRowsFromDbRows(dbRows, options) {
  return buildBundlesFromDbRows(dbRows, options).map(flattenBundle);
}

module.exports = {
  buildColumns: buildColumns,
  buildBundlesFromDbRows: buildBundlesFromDbRows,
  buildFlatRowsFromDbRows: buildFlatRowsFromDbRows,
  flattenBundle: flattenBundle,
  toCsv: toCsv
};
