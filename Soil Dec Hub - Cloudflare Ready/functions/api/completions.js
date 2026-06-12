import { json, normalize, readJsonValue } from "../_shared.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = normalize(url.searchParams.get("q")).toLowerCase();
  const completions = await readJsonValue(env, "completions", []);
  const filtered = q
    ? completions.filter((item) =>
        [item.jobNumber, item.siteName, item.siteId, item.principalContractor, item.jobAddress, item.status]
          .map((value) => normalize(value).toLowerCase())
          .some((value) => value.includes(q)),
      )
    : completions;
  return json({ ok: true, completions: filtered.slice(0, 80), persisted: Boolean(env.SOIL_DEC_KV) });
}
