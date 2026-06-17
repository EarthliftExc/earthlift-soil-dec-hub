export function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export async function readJson(request) {
  return request.json().catch(() => ({}));
}

export function accessUser(request) {
  return (
    request.headers.get("Cf-Access-Authenticated-User-Email") ||
    request.headers.get("Cf-Access-Jwt-Assertion") ||
    ""
  );
}

export function hasDatabase(env) {
  return Boolean(env?.DB?.prepare);
}

export function hasReportsBucket(env) {
  return Boolean(env?.REPORTS?.put);
}

export function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
