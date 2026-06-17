import { listSites, saveSite } from "../../_shared/db.js";
import { hasDatabase, json, readJson } from "../../_shared/http.js";

export async function onRequestGet({ env }) {
  const result = await listSites(env, { includeDisabled: true });
  return json({
    ok: true,
    cloudflare: true,
    databaseReady: result.databaseReady,
    setupWarning: result.error || "",
    sites: result.rows,
  });
}

export async function onRequestPost({ request, env }) {
  if (!hasDatabase(env)) {
    return json(
      {
        ok: false,
        cloudflare: true,
        summary: "Cloudflare D1 database is not connected yet. Create the database and add the DB binding before editing sites.",
      },
      { status: 501 },
    );
  }

  const input = await readJson(request);
  const saved = await saveSite(env, input);
  const result = await listSites(env, { includeDisabled: true });
  return json({
    ok: true,
    cloudflare: true,
    databaseReady: true,
    saved,
    sites: result.rows,
  });
}
