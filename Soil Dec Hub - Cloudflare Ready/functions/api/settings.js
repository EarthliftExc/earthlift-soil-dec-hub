import { getSettings, saveSettings } from "../_shared/db.js";
import { hasDatabase, json, readJson } from "../_shared/http.js";

export async function onRequestGet({ env }) {
  const result = await getSettings(env);
  return json({
    ok: true,
    cloudflare: true,
    databaseReady: result.databaseReady,
    setupWarning: result.error || "",
    settings: result.settings,
  });
}

export async function onRequestPost({ request, env }) {
  if (!hasDatabase(env)) {
    return json(
      {
        ok: false,
        cloudflare: true,
        summary: "Cloudflare D1 database is not connected yet. Create the database and add the DB binding before saving settings.",
      },
      { status: 501 },
    );
  }

  const settings = await readJson(request);
  const result = await saveSettings(env, settings);
  return json({
    ok: true,
    cloudflare: true,
    databaseReady: true,
    settings: result.settings,
  });
}
