import { getSettings, listSites, listSubmitters } from "../_shared/db.js";
import { json } from "../_shared/http.js";

export async function onRequestGet({ env }) {
  const [settings, submitters, sites] = await Promise.all([
    getSettings(env),
    listSubmitters(env),
    listSites(env),
  ]);

  return json({
    ok: true,
    cloudflare: true,
    version: env.HUB_VERSION || "2026.06.18.2-cloud-foundation",
    databaseReady: settings.databaseReady && submitters.databaseReady && sites.databaseReady,
    setupWarning: settings.error || submitters.error || sites.error || "",
    settings: settings.settings,
    submitters: submitters.rows,
    sites: sites.rows,
  });
}
