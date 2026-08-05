# Deploy to Railway (step by step)

This gets Kankotri Studio onto a live `https://…` link you can open on your phone
and share. It works with the app exactly as built — a persistent disk holds the
database and the generated images. Budget ~**$5/month**; setup takes ~10 minutes.

The repo already contains the Railway config (`railway.json`) and a production
start script, so most of this is clicking through Railway's dashboard.

## Before you start
- The code on GitHub (this repo). Deploy either `main` (merge the PR first) or the
  feature branch directly — Railway lets you pick the branch.
- Your **Gemini API key** from Google AI Studio.
- A **Railway account** — sign up at https://railway.com (GitHub login is easiest).

## 1. Create the project from GitHub
1. In Railway, click **New Project → Deploy from GitHub repo**.
2. Authorize Railway to see your repos, then pick **`dpatel15/Go-Transit`**.
3. Railway starts a first build. It will finish but **not work yet** — we still
   need the disk and the environment variables below. That's expected.
4. (Optional) In the service's **Settings → Source**, set the branch to deploy
   (e.g. `main` after merging the PR, or the feature branch).

## 2. Add a persistent disk (Volume)
1. Open the service → **Variables/Settings** → find **Volumes** → **New Volume**.
2. Set the **Mount path** to exactly:
   ```
   /data
   ```
3. Save. This disk is where the database file and all images live, so they
   survive restarts and redeploys.

## 3. Add the environment variables
Open the service → **Variables** → add each of these (Raw Editor makes it fast):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `IMAGE_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | *your Google AI Studio key* |
| `SESSION_SECRET` | *a long random string* (see below) |
| `DATABASE_URL` | `file:/data/prod.db` |
| `LOCAL_STORAGE_DIR` | `/data/storage` |
| `SPEND_LIMIT_USD` | `10` |

- Generate a `SESSION_SECRET` on your computer with `openssl rand -base64 48`
  (any 32+ character random string works).
- Do **not** set `PORT` — Railway provides it automatically.
- Leave `IMAGE_PROVIDER=mock` instead if you want to test for free before turning
  on real (paid) generation.

Railway will redeploy automatically when you save variables.

## 4. Get your public link
1. Service → **Settings → Networking → Generate Domain**.
2. Railway gives you a URL like `https://go-transit-production.up.railway.app`.
3. Add one more variable so links/metadata are correct, then let it redeploy:

   | Variable | Value |
   | --- | --- |
   | `APP_URL` | *your generated `https://…` URL* |

## 5. Try it
Open your URL, create an account, upload a card, pick a style, and **Generate**.
Because `IMAGE_PROVIDER=gemini`, you'll get real photoreal output (the "mock
preview" caption is gone). Your $10 in-app cap is enforced; also set a matching
budget cap in **Google Cloud Billing** on the key's project as a second lock.

## How it runs (for reference)
- Build: Railway (Nixpacks) runs `npm install` then `npm run build`
  (`prisma generate && next build`).
- Start: `railway.json` runs `npm run start:prod`, which applies the database
  schema to the volume (`prisma db push`) and then starts Next.js on Railway's port.

## Troubleshooting
- **Build fails on `sharp`** — rare; `sharp` ships prebuilt Linux binaries. Retry
  the deploy; if it persists, open an issue with the build log.
- **Images don't appear / disappear after redeploy** — the Volume isn't mounted at
  `/data`, or `LOCAL_STORAGE_DIR`/`DATABASE_URL` don't point under `/data`. Recheck
  step 2 and 3.
- **"Spend limit reached"** — you hit the in-app `$SPEND_LIMIT_USD`. Raise it (and
  your Google budget) if you intend to spend more.
- **Login won't stick** — make sure `NODE_ENV=production` and you're on the
  `https://` domain (secure cookies require HTTPS).

## Later, if you outgrow it
- Move from SQLite to **Railway Postgres**: add the Postgres plugin, change the
  `datasource` provider in `prisma/schema.prisma` to `postgresql`, set
  `DATABASE_URL` to the injected Postgres URL, and deploy.
- The storage layer is an interface — an S3/R2 driver can be added without
  touching the rest of the app if you move to multi-instance/serverless.
