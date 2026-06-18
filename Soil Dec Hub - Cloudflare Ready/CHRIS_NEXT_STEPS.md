# Chris Next Steps - Cloudflare Soil Declaration Hub

Keep using the existing `Start Soil Declaration Hub.bat` version for real submissions until a cloud sender is marked active.

## 1. Upload This Cloud Version to GitHub

1. Open GitHub.
2. Open the repo `EarthliftExc/earthlift-soil-dec-hub`.
3. Open the folder `Soil Dec Hub - Cloudflare Ready`.
4. Click `Add file`.
5. Click `Upload files`.
6. From this computer, open:

   `C:\Users\knightc\OneDrive - EarthLift\Documents\New project 2\earthlift-soil-declaration-hub\cloudflare-deploy`

7. Drag the contents of that folder into GitHub.
8. Commit to `main`.

Cloudflare should deploy automatically.

## 2. Create the Cloudflare Database

1. Open Cloudflare.
2. Go to `Workers & Pages`.
3. Open `D1 SQL Database`.
4. Click `Create database`.
5. Name it:

   `soil-dec-hub`

6. Open the new database.
7. Find the query/console area.
8. Paste the contents of:

   `cloudflare-deploy\migrations\0001_cloud_foundation.sql`

9. Run it.

## 3. Connect the Database to the Pages App

1. In Cloudflare, go to `Workers & Pages`.
2. Open `earthlift-soil-dec-hub`.
3. Go to `Settings`.
4. Go to `Bindings`.
5. Add a D1 database binding.
6. Use this variable name:

   `DB`

7. Select the `soil-dec-hub` database.
8. Save.

## 4. Create Report Storage

1. In Cloudflare, go to `R2 Object Storage`.
2. Create a bucket named:

   `soil-dec-reports`

3. Go back to `Workers & Pages`.
4. Open `earthlift-soil-dec-hub`.
5. Go to `Settings`.
6. Go to `Bindings`.
7. Add an R2 bucket binding.
8. Use this variable name:

   `REPORTS`

9. Select the `soil-dec-reports` bucket.
10. Save.

## 5. Connect Browser Run

This is what lets URM run in Cloudflare instead of on your laptop.

1. In Cloudflare, go to `Workers & Pages`.
2. Open `earthlift-soil-dec-hub`.
3. Go to `Settings`.
4. Go to `Bindings`.
5. Add a Browser Run / Browser Rendering binding.
6. Use this variable name:

   `BROWSER`

7. Save.

## 6. Check the Build Settings

1. In Cloudflare, open `earthlift-soil-dec-hub`.
2. Go to `Settings`.
3. Go to `Pages configuration`.
4. Set:

   `Root directory: Soil Dec Hub - Cloudflare Ready`

   `Build command: npm install`

   `Build output directory: public`

5. Save.

## 7. Redeploy

1. Go to `Deployments`.
2. Click `Retry deployment`.
3. Wait for `Success: Your site was deployed!`.

## 8. Test

1. Open:

   `https://earthlift-soil-dec-hub.pages.dev/admin.html`

2. It should say `Admin ready`.
3. Edit a tip site note, then click `Save site`.
4. Open:

   `https://earthlift-soil-dec-hub.pages.dev`

5. It should say `Hub ready`.
6. Enter a small URM test job.
7. Tick only `URM`.
8. Send it.
9. URM should show `Completed` or `Already Submitted` with a URX number if URM returns one.

## Important

URM is the first live cloud sender. The other tip sites still need to be rebuilt for Cloudflare.
