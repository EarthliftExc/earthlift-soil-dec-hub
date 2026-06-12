# EarthLift Soil Declaration Hub - Cloudflare Ready Copy

This folder is a Cloudflare Pages-ready copy of the Soil Declaration Hub.

It is separate from the local working copy:

```text
C:\EarthLift Apps\Soil Dec Hub
```

## What works in this Cloudflare-ready copy

- The browser app can be hosted by Cloudflare Pages.
- The existing `/api/health`, `/api/completions`, `/api/settings`, `/api/upload-report`, and `/api/submit` routes have matching Pages Functions.
- The app no longer needs a Windows startup script just to open the page.
- Settings and completed declarations can persist if a Cloudflare KV binding is added.
- Uploaded Daisy reports can be stored if an R2 binding is added.

## What still needs backend migration

The old local version starts separate sender scripts for Harkaway, URM, Landfix, Daisy's, ESG, LTE / Monk, Galcon, and Scope. Those local sender scripts are not automatically Cloudflare-compatible.

In this copy, `/api/submit` captures the request and marks each selected site as `Queued` rather than performing the real external submission.

The remaining backend work is to rebuild each sender as either:

- Cloudflare Worker / Pages Function, if it is a simple HTTP/API workflow.
- Google Cloud Run / Google Compute Engine, if it needs browser automation, fixed IP, Outlook/desktop behavior, or company-system allowlisting.

## Cloudflare Pages setup

In Cloudflare:

1. Go to Workers & Pages.
2. Create application.
3. Choose Pages.
4. Connect to Git.
5. Select the GitHub repo containing this folder.
6. Use these build settings:

```text
Framework preset: None
Build command: leave blank
Build output directory: public
```

Cloudflare will automatically pick up the `functions` folder as Pages Functions.

## Optional Cloudflare bindings

Add these bindings in Cloudflare if you want persistence:

```text
KV binding name: SOIL_DEC_KV
R2 binding name: SOIL_REPORTS_R2
```

Without these bindings, the page still loads, but settings/completed history/uploads will not be permanently stored.

## Important

Do not put passwords, API keys, or private tokens into this folder.
Use Cloudflare secrets/environment variables for sensitive values.
