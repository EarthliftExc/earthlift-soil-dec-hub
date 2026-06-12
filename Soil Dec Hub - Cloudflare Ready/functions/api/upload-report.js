import { json, safeFileName } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const fileName = safeFileName(url.searchParams.get("filename"));
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) {
    return json({ ok: false, summary: "The selected Daisy soil report was empty." }, { status: 400 });
  }

  const savedName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${fileName}`;
  if (env.SOIL_REPORTS_R2) {
    await env.SOIL_REPORTS_R2.put(savedName, bytes, {
      httpMetadata: { contentType: request.headers.get("content-type") || "application/pdf" },
    });
    return json({ ok: true, fileName, reportPath: `r2://${savedName}`, persisted: true });
  }

  return json({
    ok: true,
    fileName,
    reportPath: `cloudflare-upload-placeholder://${savedName}`,
    persisted: false,
    summary: "Upload accepted, but SOIL_REPORTS_R2 is not configured so the file was not permanently stored.",
  });
}
