import { listSites, logSubmissionAttempt } from "../_shared/db.js";
import { accessUser, json, readJson } from "../_shared/http.js";

export async function onRequestPost({ request, env }) {
  const payload = await readJson(request);
  const selectedSites = Array.isArray(payload.selectedSites) ? payload.selectedSites : [];
  const siteList = await listSites(env, { includeDisabled: true });
  const siteMap = new Map(siteList.rows.map((site) => [site.id, site]));
  const results = selectedSites.map((siteId) => {
    const site = siteMap.get(siteId);
    return {
      siteId,
      siteName: site?.name || siteId,
      status: "Cloud Sender Needed",
      summary:
        "This cloud version can record the request, but this site's Cloudflare sender has not been built yet.",
    };
  });

  await logSubmissionAttempt(env, payload, accessUser(request), results);

  return json({
    ok: true,
    cloudflare: true,
    databaseReady: siteList.databaseReady,
    jobNumber: payload.jobNumber || "",
    results,
    summary:
      "Saved the request for cloud tracking. Live sending will be enabled one site at a time as each cloud sender is rebuilt.",
  });
}
