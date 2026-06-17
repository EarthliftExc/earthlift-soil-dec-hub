# Earthlift Soil Declaration Hub - Cloudflare Package

This folder is the cloud version of the Earthlift Soil Declaration Hub. It is separate from the laptop `.bat` version, so the existing local sender can keep being used while the cloud sender is rebuilt.

## What Works

- The hub UI loads from Cloudflare Pages.
- `/api/health` returns submitters, tip sites, settings, and the deployed version.
- `admin.html` gives Alan a browser screen for editing tip sites once D1 is connected.
- `/api/completions` can search completed declarations after D1 is connected.
- `/api/upload-report` can store report PDFs after R2 is connected.
- `/api/submit` records requests in D1 after D1 is connected, but live sending is still intentionally disabled until each cloud sender is rebuilt.

## Important Limitation

The current production hub still sends declarations using Windows-only local tools:

- hidden browser sender scripts on this computer
- local `T:\DRIVERS AND TIP CODES\Programs\Soil Dec` files
- Outlook/PDF email automation

Cloudflare cannot run those Windows desktop automations directly. The cloud version must rebuild each sender using Cloudflare-safe services, starting with URM.

## Cloudflare Services Needed

- Cloudflare Pages for the website and Functions.
- Cloudflare D1 with binding name `DB`.
- Cloudflare R2 with binding name `REPORTS`.
- Cloudflare Access to limit the app to approved Earthlift users.
- Cloudflare Browser Run later, for the actual site sender automation.

## Database Setup

Create a D1 database, then run `migrations/0001_cloud_foundation.sql` against it.

The Pages project needs this binding:

```text
Variable/binding name: DB
Service: D1 database
Database: the database you created
```

## Report Storage Setup

Create an R2 bucket for reports and add this Pages binding:

```text
Variable/binding name: REPORTS
Service: R2 bucket
Bucket: the bucket you created
```

## Build Settings

If this folder is uploaded to GitHub as `Soil Dec Hub - Cloudflare Ready`, Cloudflare Pages should use:

```text
Root directory: Soil Dec Hub - Cloudflare Ready
Build command: leave blank
Build output directory: public
```

## Deploy

This project is set up for GitHub auto-deploys. Upload this folder's contents into the GitHub folder that Cloudflare is connected to, then commit to `main`.

For command-line deployment:

```powershell
npm install
npm run deploy
```

Cloudflare will ask you to log in if Wrangler is not already connected.

## Local Preview

```powershell
npm install
npm run dev
```

Then open the local Pages URL that Wrangler prints.
