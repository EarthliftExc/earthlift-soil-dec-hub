import { listSites, logSubmissionAttempt } from "../_shared/db.js";
import { accessUser, json, readJson } from "../_shared/http.js";
import { runUrmSubmission } from "../_shared/urm.js";

export async function onRequestPost({ request, env }) {
  const payload = await readJson(request);
  const selectedSites = Array.isArray(payload.selectedSites) ? payload.selectedSites : [];
  const siteList = await listSites(env, { includeDisabled: true });
  const siteMap = new Map(siteList.rows.map((site) => [site.id, site]));
  const results = [];

  for (const siteId of selectedSites) {
    const site = siteMap.get(siteId);
    const base = {
      siteId,
      siteName: site?.name || siteId,
    };

    if (siteId === "urm") {
      try {
        const result = await runUrmSubmission(env, {
          ...payload,
          customerJobNumber: payload.customerJobNumber || payload.jobNumber,
        });
        results.push({
          ...base,
          status: result.status || "Completed",
          summary: result.summary || "URM completed.",
          urmJobNumber: result.urmJobNumber || result.saveResult?.newUrmJobNumber || "",
          submitted: result.submitted !== false,
        });
      } catch (error) {
        results.push({
          ...base,
          status: "Failed",
          summary: error.message || "URM cloud sender failed.",
        });
      }
      continue;
    }

    results.push({
      ...base,
      status: "Cloud Sender Needed",
      summary:
        "This cloud version can record the request, but this site's Cloudflare sender has not been built yet.",
    });
  }

  await logSubmissionAttempt(env, payload, accessUser(request), results);

  const hasFailure = results.some((result) => String(result.status || "").toLowerCase().includes("fail"));
  const hasPendingSender = results.some((result) => String(result.status || "").toLowerCase().includes("needed"));

  return json({
    ok: true,
    cloudflare: true,
    databaseReady: siteList.databaseReady,
    jobNumber: payload.jobNumber || "",
    results,
    summary: hasFailure
      ? "One or more selected sites failed."
      : hasPendingSender
        ? "URM can run in the cloud. Other selected sites still need cloud senders rebuilt."
        : "Selected cloud senders completed.",
  });
}
