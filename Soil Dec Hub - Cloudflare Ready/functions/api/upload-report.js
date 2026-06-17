import { hasReportsBucket, json } from "../_shared/http.js";

export async function onRequestPost({ request, env }) {
  if (!hasReportsBucket(env)) {
    return json(
      {
        ok: false,
        cloudflare: true,
        summary:
          "Cloudflare R2 storage is not connected yet. Create the REPORTS bucket binding before uploading soil reports.",
      },
      { status: 501 },
    );
  }

  const url = new URL(request.url);
  const fileName = url.searchParams.get("filename") || "soil-report.pdf";
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 140);
  const key = `reports/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  await env.REPORTS.put(key, request.body, {
    httpMetadata: {
      contentType: request.headers.get("Content-Type") || "application/pdf",
    },
  });

  return json({
    ok: true,
    cloudflare: true,
    reportPath: key,
    fileName: safeName,
  });
}
