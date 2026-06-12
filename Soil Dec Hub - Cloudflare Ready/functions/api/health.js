import { DEFAULT_SETTINGS, HUB_VERSION, SITES, SUBMITTERS, json, readJsonValue } from "../_shared.js";

export async function onRequestGet({ env }) {
  const settings = await readJsonValue(env, "settings", DEFAULT_SETTINGS);
  return json({
    ok: true,
    platform: "cloudflare-pages",
    version: HUB_VERSION,
    settings,
    submitters: SUBMITTERS,
    sites: SITES.map(({ id, name, mode }) => ({ id, name, mode })),
    note: "Cloudflare-ready front-end is running. Sender backends still need migration.",
  });
}
