import { DEFAULT_SETTINGS, json, readJsonValue, writeJsonValue } from "../_shared.js";

export async function onRequestGet({ env }) {
  const settings = await readJsonValue(env, "settings", DEFAULT_SETTINGS);
  return json({ ok: true, settings, persisted: Boolean(env.SOIL_DEC_KV) });
}

export async function onRequestPost({ request, env }) {
  const raw = await request.json();
  const settings = {
    defaultSubmitter: raw.defaultSubmitter || "chris",
    emailAction: raw.emailAction === "send" ? "send" : "draft",
    esgSiteId: raw.esgSiteId || "85",
    lteDestination: raw.lteDestination || "LTE Langwarrin - Soil",
    machineSubmitter: raw.machineSubmitter || raw.defaultSubmitter || "chris",
  };
  const persisted = await writeJsonValue(env, "settings", settings);
  return json({ ok: true, settings, persisted });
}
