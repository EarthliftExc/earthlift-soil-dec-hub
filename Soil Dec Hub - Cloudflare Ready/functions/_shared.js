export const HUB_VERSION = "cloudflare-2026.06.12";

export const SUBMITTERS = [
  {
    id: "chris",
    label: "Chris Knight",
    name: "Chris Knight",
    email: "chris.knight@earthlift.com.au",
    phone: "0404817643",
  },
  {
    id: "alan",
    label: "Alan Fenner",
    name: "Alan Fenner",
    email: "alan.fenner@earthlift.com.au",
    phone: "0448517046",
  },
];

export const SITES = [
  { id: "harkaway", name: "Harkaway", mode: "backend-migration-required" },
  { id: "urm", name: "URM", mode: "backend-migration-required" },
  { id: "landfix", name: "Landfix", mode: "backend-migration-required" },
  { id: "daisys", name: "Daisy's", mode: "backend-migration-required" },
  { id: "esg", name: "ESG", mode: "backend-migration-required" },
  { id: "scope", name: "Scope", mode: "backend-migration-required" },
  { id: "lte-monk", name: "LTE / Monk", mode: "backend-migration-required" },
  { id: "galcon", name: "Galcon", mode: "backend-migration-required" },
  { id: "hanson", name: "Hanson / Heidelberg", mode: "pdf-email-migration-required" },
  { id: "landformx", name: "LandformX", mode: "pdf-email-migration-required" },
  { id: "antech", name: "Antech", mode: "pdf-email-migration-required" },
];

export const DEFAULT_SETTINGS = {
  defaultSubmitter: "chris",
  emailAction: "draft",
  esgSiteId: "85",
  lteDestination: "LTE Langwarrin - Soil",
  machineSubmitter: "chris",
};

export function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export async function readJsonValue(env, key, fallback) {
  if (!env.SOIL_DEC_KV) return fallback;
  const value = await env.SOIL_DEC_KV.get(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function writeJsonValue(env, key, value) {
  if (!env.SOIL_DEC_KV) return false;
  await env.SOIL_DEC_KV.put(key, JSON.stringify(value));
  return true;
}

export function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function safeFileName(value, fallback = "soil-report.pdf") {
  const base = normalize(value).split(/[\\/]/).pop() || fallback;
  return base.replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-").replace(/\s+/g, " ").trim() || fallback;
}

export function completionKey(jobNumber, siteId) {
  return `${normalize(jobNumber).toLowerCase()}::${normalize(siteId).toLowerCase()}`;
}

export function validateJob(raw) {
  const job = {
    submitterId: normalize(raw.submitterId || "chris"),
    jobNumber: normalize(raw.jobNumber),
    principalContractor: normalize(raw.principalContractor),
    jobAddress: normalize(raw.jobAddress),
    volume: normalize(raw.volume),
    demolition: normalize(raw.demolition || "No"),
    selectedSites: Array.isArray(raw.selectedSites) ? raw.selectedSites.map(normalize).filter(Boolean) : [],
    esgSiteId: normalize(raw.esgSiteId || "85"),
    lteDestination: normalize(raw.lteDestination || "LTE Langwarrin - Soil"),
    reportPath: normalize(raw.reportPath),
    reportFileName: normalize(raw.reportFileName),
    emailAction: raw.emailAction === "send" ? "send" : "draft",
  };

  if (!job.jobNumber) throw new Error("Job number is required.");
  if (!job.principalContractor) throw new Error("Principal Contractor is required.");
  if (!job.jobAddress) throw new Error("Job address is required.");
  if (!job.volume || Number(job.volume) <= 0) throw new Error("Volume must be greater than zero.");
  if (!job.selectedSites.length) throw new Error("Select at least one tip site.");
  return job;
}
