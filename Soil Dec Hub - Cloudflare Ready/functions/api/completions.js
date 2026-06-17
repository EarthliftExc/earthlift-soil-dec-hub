import { searchCompletions } from "../_shared/db.js";
import { json } from "../_shared/http.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const result = await searchCompletions(env, url.searchParams.get("q") || "");

  return json({
    ok: true,
    cloudflare: true,
    databaseReady: result.databaseReady,
    setupWarning: result.error || "",
    completions: result.rows,
  });
}
