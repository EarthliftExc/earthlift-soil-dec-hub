import {
  SITES,
  completionKey,
  json,
  readJsonValue,
  validateJob,
  writeJsonValue,
} from "../_shared.js";

const siteById = new Map(SITES.map((site) => [site.id, site]));

export async function onRequestPost({ request, env }) {
  try {
    const raw = await request.json();
    const job = validateJob(raw);
    const now = new Date().toISOString();
    const existing = await readJsonValue(env, "completions", []);
    const byKey = new Map(existing.map((item) => [item.key || completionKey(item.jobNumber, item.siteId), item]));

    const results = job.selectedSites.map((siteId) => {
      const site = siteById.get(siteId) || { id: siteId, name: siteId, mode: "unknown" };
      const status = "Queued";
      const summary =
        site.mode === "pdf-email-migration-required"
          ? `${site.name} request captured. PDF/email backend still needs Cloudflare or Google Cloud migration.`
          : `${site.name} request captured. Sender backend still needs Cloudflare or Google Cloud migration.`;

      byKey.set(completionKey(job.jobNumber, site.id), {
        key: completionKey(job.jobNumber, site.id),
        jobNumber: job.jobNumber,
        siteId: site.id,
        siteName: site.name,
        principalContractor: job.principalContractor,
        jobAddress: job.jobAddress,
        volume: job.volume,
        demolition: job.demolition,
        status,
        completedAt: now,
        source: "cloudflare-ready-stub",
        summary,
      });

      return { siteId: site.id, siteName: site.name, status, summary };
    });

    const completions = Array.from(byKey.values()).slice(-500);
    const persisted = await writeJsonValue(env, "completions", completions);

    return json({
      ok: true,
      status: "Queued",
      results,
      persisted,
      summary: persisted
        ? "Request captured in Cloudflare KV. Real sender backends still need migration."
        : "Request captured for this response only. Add SOIL_DEC_KV to persist history.",
    });
  } catch (error) {
    return json({ ok: false, summary: error.message || "Hub request failed." }, { status: 400 });
  }
}
