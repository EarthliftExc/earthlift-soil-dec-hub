import { defaultSettings, defaultSites, defaultSubmitters } from "./catalog.js";
import { cleanId, hasDatabase } from "./http.js";

function resultFromFallback(rows, error = "") {
  return {
    rows,
    databaseReady: false,
    source: "defaults",
    error,
  };
}

function rowBool(value) {
  return Boolean(Number(value));
}

function siteFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    method: row.method || "Webform",
    enabled: rowBool(row.enabled),
    senderStatus: row.sender_status || "planned",
    loginUrl: row.login_url || "",
    notes: row.notes || "",
    sortOrder: Number(row.sort_order || 0),
  };
}

function submitterFromRow(row) {
  return {
    id: row.id,
    label: row.label || row.name,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    active: rowBool(row.active),
    sortOrder: Number(row.sort_order || 0),
  };
}

export async function listSites(env, { includeDisabled = false } = {}) {
  if (!hasDatabase(env)) return resultFromFallback(defaultSites);
  try {
    const where = includeDisabled ? "" : "WHERE enabled = 1";
    const result = await env.DB.prepare(
      `SELECT id, name, method, enabled, sender_status, login_url, notes, sort_order
       FROM tip_sites
       ${where}
       ORDER BY sort_order ASC, name ASC`,
    ).all();
    return {
      rows: result.results.map(siteFromRow),
      databaseReady: true,
      source: "d1",
      error: "",
    };
  } catch (error) {
    return resultFromFallback(defaultSites, error.message);
  }
}

export async function listSubmitters(env) {
  if (!hasDatabase(env)) return resultFromFallback(defaultSubmitters);
  try {
    const result = await env.DB.prepare(
      `SELECT id, label, name, email, phone, active, sort_order
       FROM submitters
       WHERE active = 1
       ORDER BY sort_order ASC, name ASC`,
    ).all();
    return {
      rows: result.results.map(submitterFromRow),
      databaseReady: true,
      source: "d1",
      error: "",
    };
  } catch (error) {
    return resultFromFallback(defaultSubmitters, error.message);
  }
}

export async function getSettings(env) {
  if (!hasDatabase(env)) {
    return {
      settings: defaultSettings,
      databaseReady: false,
      source: "defaults",
      error: "",
    };
  }
  try {
    const result = await env.DB.prepare("SELECT key, value FROM settings").all();
    const settings = { ...defaultSettings };
    result.results.forEach((row) => {
      settings[row.key] = row.value;
    });
    return {
      settings,
      databaseReady: true,
      source: "d1",
      error: "",
    };
  } catch (error) {
    return {
      settings: defaultSettings,
      databaseReady: false,
      source: "defaults",
      error: error.message,
    };
  }
}

export async function saveSettings(env, input) {
  const allowed = ["defaultSubmitter", "emailAction", "esgSiteId", "lteDestination"];
  const statements = allowed
    .filter((key) => Object.hasOwn(input, key))
    .map((key) =>
      env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ).bind(key, String(input[key] ?? "")),
    );
  if (statements.length) await env.DB.batch(statements);
  return getSettings(env);
}

export async function saveSite(env, input) {
  const id = cleanId(input.id || input.name);
  if (!id) throw new Error("Enter a short site code or site name.");
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Enter the site name.");
  const sortOrder = Number(input.sortOrder ?? input.sort_order ?? 999);
  const enabled = input.enabled === false || input.enabled === "false" ? 0 : 1;
  await env.DB.prepare(
    `INSERT INTO tip_sites
      (id, name, method, enabled, sender_status, login_url, notes, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       method = excluded.method,
       enabled = excluded.enabled,
       sender_status = excluded.sender_status,
       login_url = excluded.login_url,
       notes = excluded.notes,
       sort_order = excluded.sort_order,
       updated_at = excluded.updated_at`,
  )
    .bind(
      id,
      name,
      String(input.method || "Webform"),
      enabled,
      String(input.senderStatus || input.sender_status || "planned"),
      String(input.loginUrl || input.login_url || ""),
      String(input.notes || ""),
      Number.isFinite(sortOrder) ? sortOrder : 999,
    )
    .run();
  return { id };
}

export async function searchCompletions(env, query) {
  if (!hasDatabase(env)) {
    return {
      rows: [],
      databaseReady: false,
      source: "defaults",
      error: "",
    };
  }
  try {
    const q = `%${String(query || "").trim()}%`;
    const result = await env.DB.prepare(
      `SELECT job_number, principal_contractor, job_address, volume, demolition,
              site_id, site_name, status, urm_job_number, created_at
       FROM declarations
       WHERE status IN ('Completed', 'Already Submitted', 'Accepted')
         AND (? = '%%'
           OR job_number LIKE ?
           OR job_address LIKE ?
           OR site_name LIKE ?
           OR urm_job_number LIKE ?)
       ORDER BY datetime(created_at) DESC
       LIMIT 20`,
    )
      .bind(q, q, q, q, q)
      .all();
    return {
      rows: result.results.map((row) => ({
        jobNumber: row.job_number,
        principalContractor: row.principal_contractor,
        jobAddress: row.job_address,
        volume: row.volume,
        demolition: row.demolition,
        siteId: row.site_id,
        siteName: row.site_name,
        status: row.status,
        urmJobNumber: row.urm_job_number,
        completedAt: row.created_at,
      })),
      databaseReady: true,
      source: "d1",
      error: "",
    };
  } catch (error) {
    return {
      rows: [],
      databaseReady: false,
      source: "defaults",
      error: error.message,
    };
  }
}

export async function logSubmissionAttempt(env, payload, userEmail, results) {
  if (!hasDatabase(env)) return;
  const runId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO submission_runs (id, job_number, payload_json, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(runId, payload.jobNumber || "", JSON.stringify(payload), "Cloud Sender Needed", userEmail || "")
    .run();

  const statements = results.map((result) =>
    env.DB.prepare(
      `INSERT INTO declarations
        (job_number, principal_contractor, job_address, volume, demolition, submitter_id,
         site_id, site_name, status, urm_job_number, summary, report_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      payload.jobNumber || "",
      payload.principalContractor || "",
      payload.jobAddress || "",
      payload.volume || "",
      payload.demolition || "No",
      payload.submitterId || "",
      result.siteId || "",
      result.siteName || result.siteId || "",
      result.status || "",
      result.urmJobNumber || "",
      result.summary || "",
      payload.reportPath || "",
    ),
  );
  if (statements.length) await env.DB.batch(statements);
}
