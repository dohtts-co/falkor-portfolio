# FALKOR PORTFOLIO — DEPLOYMENT

Free-forever hosting: **Vercel** (site + API) and **Supabase** (data). Both are
permanent free tiers, not trials.

| Piece | Where it lives | Cost |
|---|---|---|
| Pages, CSS, JS, `public/photos/` | Vercel CDN — static, never touches Node | Free |
| `/api`, `/auth`, `/admin/api` | One Vercel serverless function running Express | Free |
| Chapters, images, settings, admin login | Supabase Postgres, one JSONB row | Free |
| Admin-uploaded photos | Cloudinary | Free |
| Contact form | Resend | Free |

Unlike Railway there's no persistent disk, so `data.json` moved into Supabase.
Everything else about the app is unchanged.

---

## 0. First: rescue the live data off Railway

**Do this before seeding.** The `data.json` committed here is an older snapshot —
it predates the `chapter_hero_image_id` field, so it cannot be the copy Railway
was serving. Anything Dom changed through the admin panel (chapter cover images,
the homepage hero, any photos uploaded after launch) lives only on the Railway
volume at `/data/data.json`.

Railway keeps volume data until the project is deleted, so an expired trial
usually still has it:

1. railway.com → the project → your service → **Data** (or Storage → Volume)
2. Download `/data/data.json`, or open the service shell and `cat /data/data.json`
3. Save it into this folder as `data-live.json`

Then seed from that file instead in step 2:

```bash
npm run seed -- data-live.json
```

If the volume is already gone, seeding from the committed `data.json` still gives
you a working site with all 62 committed photos — you'd just re-set the hero and
chapter covers in the admin panel. Any photos uploaded through admin after launch
are still in your Cloudinary account and can be re-added.

## 1. Supabase — create the store

1. Go to supabase.com → sign in with **your own account** → **New project**.
   Name it anything (`falkor-portfolio`), pick the region closest to your
   visitors, and save the database password somewhere safe.
2. Wait for the project to finish provisioning (about a minute).
3. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and hit **Run**.
4. Open **Settings → API** (or **Project Settings → API Keys**) and copy:
   - **Project URL** → `SUPABASE_URL`
   - **`service_role` key** (click reveal) → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key bypasses row-level security. It is a server-only
> secret: never put it in frontend code, never commit it. The `anon` key is the
> public one — this app doesn't use it.

## 2. Push your existing photos and chapters into Supabase

Locally, add both values to `.env`:

```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then:

```bash
npm run seed
```

That uploads the current `data.json` — all 3 chapters and 62 images, plus the
admin login as it stands today. It refuses to run if Supabase already holds
images; add `--force` when you deliberately want to overwrite.

Verify in Supabase → **Table Editor → portfolio_state**: one row, `id = 1`.

## 3. Vercel — deploy

1. vercel.com → sign in with GitHub → **Add New… → Project**.
2. Import `dohtts-co/falkor-portfolio`.
3. Framework preset: **Other**. Leave the build command empty —
   [`vercel.json`](vercel.json) already sets `public` as the output directory.
4. Add these **Environment Variables** (all environments):

```
JWT_SECRET                  (same long random string as .env)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
RESEND_API_KEY
CONTACT_EMAIL               falkorjp@gmail.com
```

Do **not** set `PORT` or `DATA_PATH` — Vercel handles the first, and the second
is ignored whenever `SUPABASE_URL` is present.

5. **Deploy.** You get a `*.vercel.app` URL. Custom domains are free on the
   Hobby plan under Settings → Domains.

Every push to `main` redeploys automatically, same as Railway did.

## 4. Check it works

- Homepage loads and the hero photo appears
- `/portfolio.html` — all three chapters, images open in the viewer
- `/contact.html` — send a test message, confirm it arrives
- `/admin.html` — log in, rename a chapter, reload: the change persisted
- Upload a photo through admin — it goes to Cloudinary and survives redeploys

---

## How it fits together

`public/` is the deployment's static root, so photos are served from Vercel's
edge network rather than by Express. Anything that isn't a real file there is
rewritten to `api/index.js`, which is the same Express app you run locally.

[`database.js`](database.js) keeps the whole portfolio as one JSONB document and
caches it in memory, so every route kept its synchronous `db.getChapters()`
style. Two things make that safe on serverless:

- **Load gate** — each request awaits `db.ready()` before handlers run. Writes
  force a fresh read first, so a cold instance can't overwrite newer data.
- **Write flush** — [`server.js`](server.js) wraps `res.json` so queued writes
  land in Supabase *before* the response is sent. A serverless instance can be
  frozen the instant it replies; an un-awaited write would be lost.

If Supabase is unreachable the site still serves — static pages and photos are
unaffected, and API routes return 503 instead of crashing.

## Local development

With `SUPABASE_URL` blank, the app falls back to the local `data.json` file, so
`npm start` works offline with no Supabase account at all. Set the variables in
`.env` when you want to work against the live data.

## Backups

Supabase's free tier has no automatic backups, so keep a copy:

Table Editor → `portfolio_state` → export the row, or just save the JSON. To
restore, drop it in a file and run `npm run seed -- backup.json --force`.

> Free Supabase projects pause after ~1 week with **no** database traffic. A
> live portfolio gets traffic, so this generally won't trigger, but if the site
> ever shows 503s check the Supabase dashboard and hit **Restore**.
