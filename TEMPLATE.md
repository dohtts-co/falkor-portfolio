# PHOTOGRAPHY PORTFOLIO — BUILD TEMPLATE

A complete reference for building this style of photography portfolio from scratch.
Every architectural decision, code pattern, design rule, and deployment step is
documented here. Replace all `[PLACEHOLDER]` values with your own details before
building. You can hand this document to a developer or use it yourself to rebuild
from zero.

---

## TABLE OF CONTENTS

1. [Tech Stack](#1-tech-stack)
2. [Project File Structure](#2-project-file-structure)
3. [Design System](#3-design-system)
4. [Environment Variables](#4-environment-variables)
5. [Backend — server.js](#5-backend--serverjs)
6. [Backend — database.js](#6-backend--databasejs)
7. [Backend — Routes](#7-backend--routes)
8. [Frontend — Pages](#8-frontend--pages)
9. [Frontend — CSS Patterns](#9-frontend--css-patterns)
10. [Frontend — JavaScript Patterns](#10-frontend--javascript-patterns)
11. [Key Features Deep Dive](#11-key-features-deep-dive)
12. [Deployment — Vercel + Supabase](#12-deployment--vercel--supabase)
13. [Services Setup](#13-services-setup)
14. [Replication Checklist](#14-replication-checklist)

---

## PLACEHOLDERS — FILL THESE IN FIRST

Before doing anything else, decide on these values and use them consistently
throughout the build:

| Placeholder | What it is | Example |
|---|---|---|
| `[PHOTOGRAPHER_NAME]` | Brand name, all caps | `FALKOR` |
| `[PHOTOGRAPHER_HANDLE]` | Instagram handle | `@falkor_ae` |
| `[ADMIN_USERNAME]` | Admin login username | `dom` |
| `[ADMIN_PASSWORD]` | Admin login password (change immediately after first login) | `portfolio2026` |
| `[CONTACT_EMAIL]` | Email that receives contact form submissions | `hello@yoursite.com` |
| `[CITY]` | City shown in footer | `TOKYO` |
| `[YEAR]` | Year shown in footer | `2026` |
| `[TAGLINE_LINE_1]` | First line of homepage tagline | `DOCUMENTING THE QUIET LIVES OF TOKYO,` |
| `[TAGLINE_LINE_2]` | Second line of homepage tagline | `ONE FACE AT A TIME.` |
| `[CHAPTER_1]` | First portfolio chapter name | `PORTRAIT` |
| `[CHAPTER_2]` | Second portfolio chapter name | `STREETS` |
| `[CHAPTER_3]` | Third portfolio chapter name | `TOKYO` |
| `[ABOUT_TEXT]` | About page body paragraph | `Based in Tokyo...` |
| `[SITE_TITLE]` | Browser tab title | `[PHOTOGRAPHER_NAME] — PHOTOGRAPHER` |
| `[VERCEL_PROJECT]` | Vercel project name | `my-portfolio` |
| `[CLOUDINARY_FOLDER]` | Cloudinary upload folder name | `portfolio` |

---

## 1. TECH STACK

### Why these choices

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js + Express | Minimal, no compile step, runs anywhere |
| Database | One JSON document — `data.json` locally, a Supabase JSONB row in production | No native binary dependencies, and one code path for both |
| Auth | JWT in HTTP-only cookies | Secure, stateless, no session store needed |
| Passwords | bcryptjs | Pure JavaScript — no native bindings, works on all platforms |
| Image storage | Cloudinary (production) / local `uploads/` (development) | Same frontend code works for both via a redirect middleware trick |
| Upload handler | multer + multer-storage-cloudinary@4 | Requires cloudinary@^1.x — see version note below |
| Email | Resend npm package | 100 emails/day free tier, dead simple API, no SMTP config needed |
| Frontend | Vanilla HTML + CSS + JS | Zero build step — save and refresh is all that is needed |
| Fonts | Inter via Google Fonts | Clean geometric font, loads from CDN |
| Deployment | Vercel (site + API) + Supabase (data) | Git-push deploys, CDN-served photos, environment variable UI, both free forever |

### Package versions that matter

```json
{
  "cloudinary": "^1.41.3",
  "multer-storage-cloudinary": "^4.0.0",
  "resend": "^3.5.0"
}
```

> **Critical:** `multer-storage-cloudinary@4` requires `cloudinary@^1.x`.
> Do **not** upgrade cloudinary to v2 — the peer dependency will break silently.
> If npm throws a peer dependency error on install, this is why.

### Full package.json dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cloudinary": "^1.41.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.0.0",
    "multer-storage-cloudinary": "^4.0.0",
    "resend": "^3.5.0"
  }
}
```

---

## 2. PROJECT FILE STRUCTURE

```
portfolio-root/
│
├── server.js               ← Express entry point
├── database.js             ← Flat JSON database (all reads and writes)
├── package.json
├── vercel.json             ← Static root + rewrites for Vercel
├── api/index.js            ← Vercel serverless entry (exports the Express app)
├── supabase/schema.sql     ← Run once in the Supabase SQL editor
├── scripts/seed-supabase.js ← Pushes data.json into Supabase (npm run seed)
├── .env                    ← Local secrets (never commit this file)
├── .env.example            ← Documented template for env vars (safe to commit)
├── .gitignore
├── data.json               ← Live database (auto-created on first run)
│
├── middleware/
│   └── auth.js             ← JWT cookie verification middleware
│
├── routes/
│   ├── api.js              ← Public API (chapters, images, hero, contact form)
│   ├── auth.js             ← Login and logout endpoints
│   └── admin.js            ← Protected admin API (upload, delete, manage)
│
├── public/                 ← All frontend files (served as static)
│   ├── index.html          ← Homepage — full screen hero entry screen
│   ├── portfolio.html      ← Portfolio — carousel → grid → fullscreen viewer
│   ├── about.html          ← About page
│   ├── contact.html        ← Contact — form + social link
│   ├── admin.html          ← Admin panel (login protected)
│   ├── css/
│   │   ├── styles.css      ← Main site styles
│   │   └── admin.css       ← Admin panel styles
│   └── js/
│       ├── portfolio.js    ← Portfolio carousel, grid, viewer logic
│       └── admin.js        ← Admin panel logic
│
└── uploads/                ← Local image storage in development (gitignored)
```

---

## 3. DESIGN SYSTEM

### CSS variables — put these at the top of styles.css

```css
:root {
  --black:    #000000;
  --white:    #ffffff;
  --white-60: rgba(255,255,255,0.6);
  --white-40: rgba(255,255,255,0.4);
  --white-30: rgba(255,255,255,0.3);
  --white-15: rgba(255,255,255,0.15);
  --font: 'Inter', 'Helvetica Neue', Arial, sans-serif;
}

html, body {
  background: var(--black);
  color: var(--white);
  font-family: var(--font);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

.hidden { display: none !important; }
```

### Aesthetic rules (the design language)

- **Black background everywhere.** `#000` or `#0a0a0a`. Never grey panels.
- **White text only.** Varying opacity levels create hierarchy — not size changes.
- **Everything all caps.** Use `letter-spacing: 0.25em` or higher on all caps text.
- **No borders, boxes, or cards** on the public site. The photography is the visual.
- **Inter font, weights 200 / 300 / 400 / 900.** Load all four from Google Fonts.
- **Font sizes are small.** Nav and captions: 10–13px. The photos do the talking.
- **Transitions: 0.2–0.4s ease.** Never bounce, never spring, never overshoot.
- **Letter spacing is the hierarchy tool** — not size. Titles: 0.35em+. Body: 0.15–0.25em. Buttons: 0.4–0.5em.

### Google Fonts load (add to every HTML `<head>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;900&display=swap" rel="stylesheet" />
```

> Weight 900 is used for the large ghost typography in the carousel.
> The other weights cover all body text and UI.

---

## 4. ENVIRONMENT VARIABLES

### .env (local development — never commit this file)

```bash
PORT=3000
JWT_SECRET=[GENERATE A RANDOM 64-CHARACTER STRING]

# Cloudinary — leave blank to use local disk storage during development
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Supabase — production store. Leave blank locally to use ./data.json on disk.
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Database path — local file mode only, ignored when SUPABASE_URL is set
DATA_PATH=

# Resend — for contact form emails
RESEND_API_KEY=
CONTACT_EMAIL=[CONTACT_EMAIL]
```

### .env.example (commit this — documents the vars without secrets)

Same content as above but with descriptive placeholder values and comments
explaining what each variable does and where to get it.

### .gitignore

```
node_modules/
uploads/
.env
*.log
```

---

## 5. BACKEND — server.js

```javascript
require('dotenv').config();
const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Cloudinary URL redirect ────────────────────────────────────────────────
// The frontend renders every image as `/${img.filename}`.
// When Cloudinary stores an image, filename is the full https://... URL.
// This creates a path like `/https://res.cloudinary.com/...`
// This middleware catches that and redirects to the real URL transparently.
// Local images (uploads/) are not affected — their paths do not start with /http.
app.use((req, res, next) => {
  const raw = decodeURIComponent(req.path);
  if (raw.startsWith('/https://') || raw.startsWith('/http://')) {
    return res.redirect(302, raw.slice(1));
  }
  next();
});

// ── Static files ──────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api',       require('./routes/api'));
app.use('/auth',      require('./routes/auth'));
app.use('/admin/api', require('./routes/admin'));

// ── SPA fallback ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
```

---

## 6. BACKEND — database.js

The entire database is one JSON document. This avoids all native binary
compilation issues, and the same document is either a file on disk (local) or a
single JSONB row in Supabase (production) — the calling code cannot tell.

### Full database schema

```json
{
  "_next_image_id": 1,
  "_next_chapter_id": 4,

  "chapters": [
    {
      "id": 1,
      "name": "[CHAPTER_1]",
      "slug": "[chapter-1-slug]",
      "sort_order": 0,
      "chapter_hero_image_id": null
    },
    {
      "id": 2,
      "name": "[CHAPTER_2]",
      "slug": "[chapter-2-slug]",
      "sort_order": 1,
      "chapter_hero_image_id": null
    },
    {
      "id": 3,
      "name": "[CHAPTER_3]",
      "slug": "[chapter-3-slug]",
      "sort_order": 2,
      "chapter_hero_image_id": null
    }
  ],

  "images": [
    {
      "id": 1,
      "filename": "uploads/abc123.jpg",
      "cloudinary_public_id": null,
      "original_name": "my-photo.jpg",
      "chapter_id": 1,
      "sort_order": 0,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ],

  "settings": {
    "hero_image_id": null
  },

  "admin": {
    "id": 1,
    "username": "[ADMIN_USERNAME]",
    "password_hash": "[BCRYPT HASH OF ADMIN_PASSWORD — generated by bcrypt.hashSync()]"
  }
}
```

### database.js seed data and structure

```javascript
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATA_PATH || path.join(__dirname, 'data.json');
const dbDir   = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const DEFAULT_DATA = {
  chapters: [
    { id: 1, name: '[CHAPTER_1]', slug: '[chapter-1]', sort_order: 0, chapter_hero_image_id: null },
    { id: 2, name: '[CHAPTER_2]', slug: '[chapter-2]', sort_order: 1, chapter_hero_image_id: null },
    { id: 3, name: '[CHAPTER_3]', slug: '[chapter-3]', sort_order: 2, chapter_hero_image_id: null },
  ],
  images: [],
  settings: { hero_image_id: null },
  admin: {
    id: 1,
    username: '[ADMIN_USERNAME]',
    password_hash: bcrypt.hashSync('[ADMIN_PASSWORD]', 10),
  },
  _next_image_id:   1,
  _next_chapter_id: 4,
};
```

> Start with 3 chapters. More can be added at any time through the admin panel.
> Chapter slugs must be URL-safe: lowercase, no spaces, hyphens only.

### Migration function — run on every startup

This safely adds new fields to existing data without breaking old records.
Extend it whenever you add a new field to the schema:

```javascript
function migrate() {
  if (!data._next_chapter_id) {
    const maxId = data.chapters.length
      ? Math.max(...data.chapters.map(c => c.id)) : 0;
    data._next_chapter_id = maxId + 1;
  }
  data.chapters.forEach(ch => {
    if (ch.chapter_hero_image_id === undefined)
      ch.chapter_hero_image_id = null;
  });
  data.images.forEach(img => {
    if (img.cloudinary_public_id === undefined)
      img.cloudinary_public_id = null;
  });
  save();
}
```

### The `filename` field — how local and Cloudinary images coexist

| Storage | `filename` value | How it's served |
|---|---|---|
| Local dev | `"uploads/abc123.jpg"` | `GET /uploads/abc123.jpg` via Express static |
| Cloudinary | `"https://res.cloudinary.com/..."` | Server redirect strips leading `/` |

Frontend always uses `/${img.filename}`. The redirect middleware in server.js
makes both cases completely transparent to the browser.

---

## 7. BACKEND — Routes

### routes/api.js — public endpoints

```javascript
const express = require('express');
const db      = require('../database');
const router  = express.Router();

// GET /api/chapters
// Returns chapters with lead_image, hero_image, image_count
router.get('/chapters', (req, res) => {
  const chapters = db.getChapters();
  const result = chapters.map(ch => {
    const images    = db.getImagesByChapter(ch.id);
    const heroImage = ch.chapter_hero_image_id
      ? db.getImageById(ch.chapter_hero_image_id) : null;
    return {
      ...ch,
      lead_image:  images[0] || null,   // first image — fallback cover
      hero_image:  heroImage,           // designated chapter intro image
      image_count: images.length,
    };
  });
  res.json(result);
});

// GET /api/chapters/:slug
// Returns chapter with hero_image + full images array
router.get('/chapters/:slug', (req, res) => {
  const chapter = db.getChapterBySlug(req.params.slug);
  if (!chapter) return res.status(404).json({ error: 'Not found' });
  const images    = db.getImagesByChapter(chapter.id);
  const heroImage = chapter.chapter_hero_image_id
    ? db.getImageById(chapter.chapter_hero_image_id) : null;
  res.json({ ...chapter, hero_image: heroImage, images });
});

// GET /api/hero
// Returns the designated homepage hero image
router.get('/hero', (req, res) => {
  const heroId = db.getHeroImageId();
  if (!heroId) return res.json(null);
  res.json(db.getImageById(heroId) || null);
});

// POST /api/contact — sends email via Resend
router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message)
    return res.status(400).json({ error: 'All fields are required.' });
  if (!process.env.RESEND_API_KEY)
    return res.status(503).json({ error: 'Contact form is not configured.' });

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      // NOTE: Replace onboarding@resend.dev with a verified custom domain address
      // once you verify a domain in the Resend dashboard (resend.com → Domains).
      // Without a verified domain, Resend on the free plan only delivers to the
      // account owner's email address.
      from:    '[PHOTOGRAPHER_NAME] Contact <onboarding@resend.dev>',
      to:      process.env.CONTACT_EMAIL || '[CONTACT_EMAIL]',
      replyTo: email,
      subject: `[PHOTOGRAPHER_NAME] — MESSAGE FROM ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <br/>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Resend error', err);
    res.status(500).json({ error: 'Failed to send. Please try again.' });
  }
});

module.exports = router;
```

### routes/auth.js — login and logout

```javascript
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');
const router  = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = db.getAdmin();
  if (username !== admin.username)
    return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

module.exports = router;
```

### middleware/auth.js — protect admin routes

```javascript
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
};
```

### routes/admin.js — Cloudinary vs local storage switching pattern

```javascript
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET
);

let upload;

if (useCloudinary) {
  cloudinary.config({ /* env vars */ });
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: '[CLOUDINARY_FOLDER]',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
  });
  upload = multer({ storage });
} else {
  // Local disk — development fallback
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync('./uploads', { recursive: true });
      cb(null, './uploads');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    },
  });
  upload = multer({ storage });
}

// After upload, extract filename and cloudinary_public_id:
// Cloudinary:  file.path     → full secure_url → use as filename
//              file.filename → public_id        → use as cloudinary_public_id
// Local:       'uploads/' + file.filename       → use as filename
//              null                             → cloudinary_public_id
```

---

## 8. FRONTEND — Pages

### index.html — Homepage entry screen

Full-screen hero image with centered text overlay and an ENTER button.
The hero image is fetched dynamically from `GET /api/hero`.
On ENTER, the entry screen fades out and the main nav/content fades in.

```html
<div id="entry-screen">
  <div id="hero-image-container">
    <img id="hero-img" src="" alt="" />
    <div id="hero-fallback"></div>
    <!-- ::after pseudo-element in CSS provides the gradient overlay -->
  </div>

  <div id="entry-text">
    <p class="entry-name">[PHOTOGRAPHER_NAME]</p>
    <p class="entry-role">PHOTOGRAPHER</p>
    <p class="entry-tagline">[TAGLINE_LINE_1]<br>[TAGLINE_LINE_2]</p>
    <button id="enter-btn" onclick="enterSite()">ENTER</button>
  </div>
</div>
```

```javascript
// Hero image load
fetch('/api/hero')
  .then(r => r.json())
  .then(image => {
    if (image?.filename) {
      document.getElementById('hero-img').src = '/' + image.filename;
    }
  });

// Enter transition
function enterSite() {
  const entry = document.getElementById('entry-screen');
  const site  = document.getElementById('site');
  entry.classList.add('fade-out');
  setTimeout(() => {
    entry.style.display = 'none';
    site.classList.remove('hidden');
    site.classList.add('fade-in');
    sessionStorage.setItem('entered', '1');
  }, 600);
}

// Skip entry screen if already passed this session
if (sessionStorage.getItem('entered')) {
  document.getElementById('entry-screen').style.display = 'none';
  document.getElementById('site').classList.remove('hidden');
}
```

### portfolio.html — 3-stage portfolio

**Stage 1 — Carousel** (`#chapters-carousel-view`):
```html
<div id="chapters-carousel-view">
  <div id="c-stage">
    <div id="c-left">
      <span class="c-word" id="c-word-left"></span>
      <button class="c-nav-btn" id="c-prev">&#8592;</button>
    </div>
    <div id="c-track"></div>
    <div id="c-right">
      <button class="c-nav-btn" id="c-next">&#8594;</button>
      <span class="c-word" id="c-word-right"></span>
    </div>
  </div>
  <div id="no-images-notice" class="hidden">
    <p>NO IMAGES UPLOADED YET.<br>LOG IN AS ADMIN TO ADD PHOTOGRAPHS.</p>
  </div>
</div>
```

**Stage 2 — Image grid** (`#chapter-grid-view`):
```html
<div id="chapter-grid-view" class="hidden">
  <header id="chapter-grid-header">
    <button id="grid-back-btn" onclick="showChapters()">&#8592; BACK</button>
    <span id="grid-chapter-title"></span>
  </header>
  <div id="chapter-image-grid"></div>
</div>
```

**Optional — Chapter intro screen** (`#chapter-intro`):
```html
<div id="chapter-intro" class="hidden">
  <div id="chapter-intro-bg-wrap">
    <img id="chapter-intro-img" src="" alt="" />
  </div>
  <div id="chapter-intro-overlay"></div>
  <div id="chapter-intro-content">
    <p id="chapter-intro-label">[PHOTOGRAPHER_NAME]</p>
    <p id="chapter-intro-title"></p>
    <button id="chapter-intro-enter">ENTER &nbsp;&#8594;</button>
  </div>
</div>
```

**Stage 3 — Fullscreen viewer** (`#chapter-view`):
```html
<div id="chapter-view" class="hidden">
  <header id="chapter-header">
    <button id="back-btn" onclick="closeViewer()">&#8592; BACK</button>
    <span id="chapter-title"></span>
  </header>
  <div id="image-viewer">
    <div id="viewer-blur-bg">
      <img id="viewer-blur-img" src="" alt="" />
    </div>
    <button id="prev-btn" class="viewer-btn">&#8592;</button>
    <div id="viewer-image-wrap">
      <img id="viewer-img" src="" alt="" />
      <p id="viewer-caption"></p>
    </div>
    <button id="next-btn" class="viewer-btn">&#8594;</button>
  </div>
  <div id="viewer-counter"></div>
</div>
```

### contact.html — Contact form

```html
<main class="contact-main">
  <div class="contact-content">
    <div class="contact-instruction">
      <p>FOR WORK ENQUIRIES AND COLLABORATIONS</p>
    </div>

    <form class="contact-form" id="contact-form" onsubmit="submitForm(event)">
      <div class="form-field">
        <label for="contact-name">NAME</label>
        <input type="text" id="contact-name" required autocomplete="name" />
      </div>
      <div class="form-field">
        <label for="contact-email">EMAIL</label>
        <input type="email" id="contact-email" required autocomplete="email" />
      </div>
      <div class="form-field">
        <label for="contact-message">MESSAGE</label>
        <textarea id="contact-message" rows="5" required></textarea>
      </div>
      <button type="submit" class="submit-btn" id="submit-btn">SEND</button>
    </form>

    <p class="form-status hidden" id="form-status"></p>

    <div class="contact-direct">
      <p>OR DM ON INSTAGRAM:
        <a href="https://www.instagram.com/[PHOTOGRAPHER_HANDLE]/"
           target="_blank" rel="noopener">@[PHOTOGRAPHER_HANDLE]</a>
      </p>
    </div>
  </div>
</main>
```

---

## 9. FRONTEND — CSS PATTERNS

### Nav — fixed, gradient fade to transparent

```css
#nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 40px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
}
.nav-link { font-size: 11px; font-weight: 300; letter-spacing: 0.25em; color: var(--white-60); }
.nav-link:hover, .nav-link.active { color: var(--white); }
```

### Footer — fixed, gradient fade to transparent

```css
#footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%);
}
```

### Hero text legibility system — all 5 layers

```css
/* Layer 1 — Radial gradient overlay between image and text
   Darkest at centre where text sits, near-transparent at edges.
   z-index 1 = above image, below text (z-index 2). */
#hero-image-container::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(0,0,0,0.62) 0%,
    rgba(0,0,0,0.30) 45%,
    rgba(0,0,0,0.08) 100%
  );
  z-index: 1;
  pointer-events: none;
}

/* Layer 3 — Backdrop blur on the text container.
   Nearly invisible — blur(1px) softens image texture under letterforms. */
#entry-text {
  position: relative;
  z-index: 2;
  padding: 40px 48px;
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  background: rgba(0,0,0,0.08);
}

/* Layer 2 — Text shadow on all hero text elements.
   Tight shadow for hard edge + wide shadow for dark aura around each word.
   Together these guarantee legibility over any image tone. */
.entry-name,
.entry-role,
.entry-tagline,
#enter-btn {
  text-shadow:
    0 1px 12px rgba(0,0,0,0.9),
    0 0  40px rgba(0,0,0,0.6);
}

/* Layer 4 — ENTER button: dark frosted backing separates CTA from image */
#enter-btn {
  border: 1px solid rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
#enter-btn:hover {
  border-color: var(--white);
  background: rgba(0,0,0,0.40);
}

/* Layer 5 — Letter spacing: wide tracking gives shadows room to render cleanly */
.entry-name    { font-size: 13px; font-weight: 400; letter-spacing: 0.4em; }
.entry-role    { font-size: 11px; font-weight: 300; letter-spacing: 0.45em; color: var(--white-60); }
.entry-tagline { font-size: 11px; font-weight: 300; letter-spacing: 0.25em; line-height: 2.2; color: var(--white-60); }
```

### Carousel — custom 3D with split-word typography

```css
/* Five-element row: [word-left][←btn][track][→btn][word-right] */
#c-stage {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 80px 40px;
  box-sizing: border-box;
}

/* Left and right columns contain the ghost word + nav button */
#c-left, #c-right {
  flex: 1;
  min-width: 0;           /* allow flex shrinking */
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;       /* clip ghost text at column boundary */
}

/* Ghost typographic word halves */
.c-word {
  flex: 1;
  min-width: 0;
  font-size: clamp(72px, 11vw, 156px);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1;
  color: rgba(255,255,255,0.13);
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease;
}
#c-word-left  { text-align: right; }
#c-word-right { text-align: left; }

/* Card track — clipping window for exactly 3 cards */
#c-track {
  position: relative;
  flex-shrink: 0;
  width: 800px;
  height: 480px;
  overflow: hidden;
}

/* Base card — centered with margin trick so transform-origin = card centre */
.c-card {
  position: absolute;
  left: 50%; top: 50%;
  width: 320px; height: 460px;
  margin-left: -160px; margin-top: -230px;
  background-size: cover;
  background-position: center;
  background-color: #111;
  cursor: pointer;
  will-change: transform, filter, opacity;
  transition: transform 0.4s ease, filter 0.4s ease, opacity 0.4s ease;
}

/* Card position states */
.c-pos-center {
  transform: perspective(1000px) translateX(0) rotateY(0deg) scale(1);
  filter: brightness(1); opacity: 1; z-index: 3;
}
.c-pos-left {
  transform: perspective(1000px) translateX(-304px) rotateY(40deg) scale(0.6);
  filter: brightness(0.5); opacity: 1; z-index: 2;
}
.c-pos-right {
  transform: perspective(1000px) translateX(304px) rotateY(-40deg) scale(0.6);
  filter: brightness(0.5); opacity: 1; z-index: 2;
}
/* Offscreen: outside the 800px track so overflow:hidden clips them */
.c-pos-offscreen-left {
  transform: perspective(1000px) translateX(-560px) rotateY(40deg) scale(0.6);
  opacity: 0; z-index: 1; pointer-events: none;
}
.c-pos-offscreen-right {
  transform: perspective(1000px) translateX(560px) rotateY(-40deg) scale(0.6);
  opacity: 0; z-index: 1; pointer-events: none;
}
```

### Fullscreen viewer — blurred colour background

```css
#image-viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 100vh;
  overflow: hidden;
}

/* Blurred colour layer — same image, heavily filtered */
#viewer-blur-bg { position: absolute; inset: 0; z-index: 0; }
#viewer-blur-img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: blur(40px) brightness(0.35) saturate(1.6);
  transform: scale(1.08); /* hides blur edge halos */
}

/* Actual sharp image sits above blur layer */
#viewer-image-wrap { position: relative; z-index: 1; }
#viewer-img {
  max-height: calc(100vh - 160px);
  max-width: 100%;
  object-fit: contain;
}
```

### Chapter intro / sub-hero screen

```css
#chapter-intro {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
}
#chapter-intro-bg-wrap { position: absolute; inset: 0; overflow: hidden; }
#chapter-intro-img { width: 100%; height: 100%; object-fit: cover; }
#chapter-intro-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
#chapter-intro-content { position: relative; z-index: 2; text-align: center; }
```

### Image grid — masonry style with CSS columns

```css
#chapter-image-grid {
  columns: 3;
  column-gap: 3px;
  padding: 0 3px;
}
#chapter-image-grid img {
  display: block;
  width: 100%;
  height: auto;
  margin-bottom: 3px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
#chapter-image-grid img:hover { opacity: 0.82; }

/* Responsive */
@media (max-width: 768px) { #chapter-image-grid { columns: 2; } }
```

### Contact form — labels above, bottom border only

```css
.form-field { display: flex; flex-direction: column; gap: 10px; }

.form-field label {
  font-size: 10px; font-weight: 300;
  letter-spacing: 0.4em; color: var(--white-40);
}
.form-field input, .form-field textarea {
  background: none; border: none;
  border-bottom: 1px solid var(--white-30);
  color: var(--white); font-size: 11px; letter-spacing: 0.15em;
  padding: 8px 0; outline: none; resize: none;
  transition: border-color 0.2s;
}
.form-field input:focus,
.form-field textarea:focus { border-bottom-color: var(--white); }

/* White background black text submit button */
.submit-btn {
  background: var(--white); color: var(--black);
  border: none; padding: 13px 36px;
  font-size: 11px; letter-spacing: 0.35em;
  cursor: pointer; transition: opacity 0.2s;
}
.submit-btn:hover    { opacity: 0.85; }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
```

---

## 10. FRONTEND — JavaScript PATTERNS

### The two core helpers used everywhere

```javascript
// Resolves both local paths and Cloudinary URLs to a usable src
function imgSrc(filename) {
  return filename.startsWith('http') ? filename : '/' + filename;
}

// Modulo that works correctly for negative numbers (for infinite loops)
// mod(-1, 3) = 2  ←  regular JS % gives -1 which breaks array indexing
function mod(n, m) {
  return ((n % m) + m) % m;
}
```

### Split-word algorithm

```javascript
// Splits the chapter name at its midpoint.
// Even length: equal halves. Odd length: extra char goes to the RIGHT half.
//
// "PORTRAIT" (8) → ["PORT",  "RAIT"]   ← even, exactly half
// "STREETS"  (7) → ["STR",   "EETS"]   ← odd, right gets extra
// "TOKYO"    (5) → ["TO",    "KYO"]    ← odd, right gets extra
// "JAPAN"    (5) → ["JA",    "PAN"]    ← odd, right gets extra
function splitWord(name) {
  const s   = name.toUpperCase();
  const mid = Math.floor(s.length / 2);
  return [s.slice(0, mid), s.slice(mid)];
}

// Crossfades the ghost word during carousel rotation
// animate=false → instant (used on initial render and carousel rebuild)
// animate=true  → 200ms fade out, text swap, 200ms fade in (used during rotation)
function updateSplitWord(name, animate) {
  const leftEl  = document.getElementById('c-word-left');
  const rightEl = document.getElementById('c-word-right');
  const [left, right] = splitWord(name);

  if (!animate) {
    leftEl.textContent = left;
    rightEl.textContent = right;
    leftEl.style.opacity = rightEl.style.opacity = '1';
    return;
  }

  leftEl.style.opacity = rightEl.style.opacity = '0';
  setTimeout(() => {
    leftEl.textContent = left;
    rightEl.textContent = right;
    leftEl.style.opacity = rightEl.style.opacity = '1';
  }, 200);
}
```

> Add `transition: opacity 0.2s ease` to `.c-word` in CSS for the fade to work.
> The 200ms fade out + 200ms fade in = 400ms total, matching the card transition.

### Carousel rotation — the reflow trick

The most important pattern in the carousel. Without the forced reflow, the
browser skips the enter animation and the card jumps from offscreen to its
final position instantly.

```javascript
function rotate(dir) {
  if (isAnimating) return;   // gate prevents overlapping transitions
  isAnimating = true;

  // 1. Determine which chapter enters and update the ghost word
  const newCentreChapter = visibleChapters[
    dir === 1 ? mod(centerIdx - 1, n) : mod(centerIdx + 1, n)
  ];
  updateSplitWord(newCentreChapter.name, true);

  // 2. Create the entering card and add it at its starting (offscreen) position
  const enterCard = makeCard(enterChapter);
  enterCard.classList.add(dir === 1 ? 'c-pos-offscreen-left' : 'c-pos-offscreen-right');
  track.appendChild(enterCard);

  // 3. Force the browser to render the initial position before continuing.
  //    Without this line, the browser batches the class changes and the
  //    entering card never transitions — it just appears at its final position.
  void enterCard.offsetWidth;

  // 4. Change all classes simultaneously — CSS transition fires on all cards
  leftCard.classList.remove('c-pos-left');
  leftCard.classList.add(dir === 1 ? 'c-pos-center' : 'c-pos-offscreen-left');
  // ... etc for all cards

  // 5. Clean up after transition ends (slightly longer than the 400ms CSS transition)
  setTimeout(() => {
    exitingCard.remove();
    isAnimating = false;  // unlock for next interaction
  }, 450);
}
```

### Stage navigation — hide/show with .hidden class

Never remove pages from the DOM. Hide and show with the `.hidden` class.
Always hide the nav bar when entering a chapter (back button would collide with it).

```javascript
function openChapter(slug) {
  document.getElementById('chapters-carousel-view').classList.add('hidden');
  document.getElementById('nav').classList.add('hidden');    // ← hide nav
  // show intro or grid...
}

function showChapters() {
  document.getElementById('chapter-grid-view').classList.add('hidden');
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapter-intro').classList.add('hidden');
  document.getElementById('chapters-carousel-view').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden'); // ← restore nav

  // Restore carousel to the chapter the user was just in
  if (carouselCenterSlug) {
    const idx = visibleChapters.findIndex(ch => ch.slug === carouselCenterSlug);
    if (idx !== -1) centerIdx = idx;
  }
  buildCarousel(); // rebuilds DOM + updates split word immediately
}
```

### Contact form submit

```javascript
async function submitForm(e) {
  e.preventDefault();
  const btn    = document.getElementById('submit-btn');
  const form   = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  btn.disabled = true;
  btn.textContent = 'SENDING';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    document.getElementById('contact-name').value.trim(),
        email:   document.getElementById('contact-email').value.trim(),
        message: document.getElementById('contact-message').value.trim(),
      }),
    });
    const data = await res.json();

    if (res.ok) {
      form.classList.add('hidden');        // replace form with confirmation
      status.textContent = 'MESSAGE SENT.';
      status.classList.remove('hidden');
    } else {
      status.textContent = data.error || 'SOMETHING WENT WRONG. PLEASE TRY AGAIN.';
      status.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'SEND';
    }
  } catch {
    status.textContent = 'SOMETHING WENT WRONG. PLEASE TRY AGAIN.';
    status.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'SEND';
  }
}
```

---

## 11. KEY FEATURES DEEP DIVE

### Chapter system

Each chapter is a named collection of images. Chapters have:
- `name` — displayed name (e.g. PORTRAIT)
- `slug` — URL-safe identifier (e.g. portrait)
- `sort_order` — controls display order in the carousel
- `chapter_hero_image_id` — optional: if set, clicking the chapter in the carousel
  shows a full-screen intro screen before the photo grid

Chapters can be created, renamed, and deleted from the admin panel.
Deleting a chapter unassigns its images but does not delete the images.

### Setting a chapter cover (sub-hero)

In the admin panel → MANAGE tab, each image card has a ☆ COVER button
(only visible on images that belong to a chapter). Clicking it sets that
image as the chapter's `chapter_hero_image_id`. The button turns filled (★)
when active. Only one cover per chapter. Click again to remove.

### Setting the homepage hero image

In the admin panel → MANAGE tab, each image has a ★ HERO button.
Clicking it sets `settings.hero_image_id` to that image.
Only one hero at a time. Click again to unset.

### Cloudinary transparency in production

The Cloudinary redirect middleware in `server.js` means:

```javascript
// Frontend code is identical in dev and production:
function imgSrc(filename) {
  return filename.startsWith('http') ? filename : '/' + filename;
}
// <img src={imgSrc(img.filename)} />
```

In development: `filename = "uploads/abc.jpg"` → served as `/uploads/abc.jpg`
In production:  `filename = "https://res.cloudinary.com/..."` → 302 redirect

No environment checks anywhere in the frontend. The server handles it.

### Serverless has no disk — why the data lives in Supabase

Vercel's filesystem is read-only and every request may hit a fresh instance, so
`data.json` cannot be written in production. No free-forever host offers a
persistent disk (Railway's volumes are a paid-plan feature after the trial).

The fix keeps the JSON-document model instead of normalising into tables: the
whole document lives in one JSONB row, is cached in memory per instance, and is
flushed back on write. The data layer keeps its synchronous API, so every route
stays exactly as written.

**Setup:** run `supabase/schema.sql` once, set `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, then `npm run seed` to push the local `data.json`.

Two rules make this safe on serverless:

1. **Gate every request on the store being loaded.** Mutations force a fresh
   read first, so a cold instance never overwrites newer data with its cache.
2. **Flush writes before responding.** Wrap `res.json` so queued writes land
   before the reply goes out — the instance can be frozen the moment it
   responds, and an un-awaited write silently disappears.

Leave the Supabase vars unset locally and the same code writes `data.json` to
disk, so development needs no account and works offline.

### Admin authentication flow

1. `/admin.html` loads — no server-side auth check on the HTML file itself
2. `admin.js` immediately calls `GET /admin/api/check` to test the cookie
3. If 401 → show login form, hide the dashboard
4. `POST /auth/login` → server checks username + bcrypt password → sets httpOnly JWT cookie
5. All subsequent `admin/api/*` requests send the cookie automatically
6. `POST /auth/logout` → clears the cookie, redirect to login

The `httpOnly` cookie cannot be read or stolen by JavaScript — only sent automatically by the browser.

---

## 12. DEPLOYMENT — Vercel + Supabase

Both are permanent free tiers. Vercel serves the static site from its CDN and
runs Express as one serverless function; Supabase stores the data.

### Layout requirements

Everything served statically must live in `public/` — that includes the
committed photo folder (`public/photos/`), because `public/` becomes the
deployment's static root. The Express app is exported rather than started:

```js
if (require.main === module) {
  app.listen(PORT, () => { /* local only */ });
}
module.exports = app;
```

### api/index.js

```js
module.exports = require('../server');
```

### vercel.json (project root)

```json
{
  "outputDirectory": "public",
  "functions": {
    "api/index.js": {
      "includeFiles": "public/*.html",
      "excludeFiles": "public/photos/**"
    }
  },
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }]
}
```

Vercel checks the filesystem before applying rewrites, so real files in
`public/` are served from the edge and only unmatched paths reach Express.
`includeFiles` keeps the HTML available for the SPA fallback's `sendFile`;
`excludeFiles` keeps the photo library out of the function bundle.

### One-time setup

1. Push to GitHub (`git push origin main`)
2. supabase.com → New project → SQL Editor → run `supabase/schema.sql`
3. Copy the Project URL and the **service_role** key from Settings → API
4. Locally: put both in `.env`, then `npm run seed` to upload `data.json`
5. vercel.com → Add New Project → import the repo → framework preset **Other**
6. Add environment variables (all environments):

```
JWT_SECRET                 [64-character random string]
SUPABASE_URL               [https://xxx.supabase.co]
SUPABASE_SERVICE_ROLE_KEY  [server-only secret — never expose]
CLOUDINARY_CLOUD_NAME      [from Cloudinary dashboard]
CLOUDINARY_API_KEY         [from Cloudinary dashboard]
CLOUDINARY_API_SECRET      [from Cloudinary dashboard]
RESEND_API_KEY             [from Resend dashboard]
CONTACT_EMAIL              [CONTACT_EMAIL]
```

`PORT` and `DATA_PATH` are not set in production — Vercel provides the first and
the second is ignored whenever `SUPABASE_URL` is present.

7. Deploy. Add a custom domain under Settings → Domains (free on Hobby).

### Deployment size

Import the repo from GitHub rather than uploading via the CLI. A photo-heavy
portfolio easily exceeds the CLI upload limit, while Git-based deploys clone the
repo instead.

### Every future update

```bash
git add .
git commit -m "describe your change"
git push origin main
# Vercel auto-deploys in about 60 seconds
```

---

## 13. SERVICES SETUP

### Cloudinary (image hosting — free tier 25 GB)

1. cloudinary.com → Sign up for a free account
2. Dashboard → API Keys (top right settings)
3. Copy: Cloud Name, API Key, API Secret
4. Paste into `.env` locally and Vercel Environment Variables in production

Images are automatically stored in a folder named `[CLOUDINARY_FOLDER]` in your Cloudinary account. You can see them in the Cloudinary Media Library.

### Resend (transactional email — 100 emails/day free)

1. resend.com → Sign up
2. Dashboard → API Keys → Create API Key → copy it
3. Paste into `.env` as `RESEND_API_KEY` and add to Vercel Environment Variables
4. The `from` address defaults to `onboarding@resend.dev`

**To use a custom from address** (e.g. `hello@yourdomain.com`):
- Resend dashboard → Domains → Add Domain
- Add the DNS TXT and MX records your domain registrar
- Once verified (takes 5–10 minutes), update the `from` field in `routes/api.js`
- Without a verified domain, Resend free plan only delivers to the account owner's email

### Generate a JWT secret

Run this in any terminal to get a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 14. REPLICATION CHECKLIST

Follow this list in order to build a fresh portfolio for a new photographer.

### Step 1 — Prepare the codebase

- [ ] Copy the project to a new folder
- [ ] Delete `data.json`, `uploads/` folder, any local photos
- [ ] Run `npm install`

### Step 2 — Update identity

- [ ] `database.js` → update DEFAULT_DATA: admin username, admin password, chapter names and slugs
- [ ] `public/index.html` → update: photographer name, tagline, title tag
- [ ] `public/portfolio.html` → update: title tag, footer text
- [ ] `public/about.html` → update: title tag, about text, photographer name, footer text
- [ ] `public/contact.html` → update: title tag, Instagram handle, footer text, CONTACT_EMAIL fallback in route
- [ ] `public/admin.html` → update: title tag
- [ ] `routes/api.js` → update: email subject line, `from` name, `to` fallback email
- [ ] All HTML files → find/replace footer "NAME · CITY · YEAR" with correct values

### Step 3 — Set up services

- [ ] Create Cloudinary account → copy Cloud Name, API Key, API Secret
- [ ] Create Resend account → copy API Key
- [ ] Generate a 64-char JWT secret
- [ ] Fill in `.env` with all values

### Step 4 — Deploy to Vercel + Supabase

- [ ] Push code to a new GitHub repo (`git init`, `git add .`, `git commit`, `git push`)
- [ ] Create a Supabase project → SQL Editor → run `supabase/schema.sql`
- [ ] Copy the Project URL and service_role key into `.env`
- [ ] `npm run seed` to push the local `data.json` into Supabase
- [ ] Import the GitHub repo on vercel.com → framework preset **Other**
- [ ] Add all environment variables in Vercel Settings → Environment Variables
- [ ] Confirm the site loads at the `*.vercel.app` domain
- [ ] Optionally add a custom domain under Settings → Domains

### Step 5 — Content setup

- [ ] Log into `/admin.html` with `[ADMIN_USERNAME]` / `[ADMIN_PASSWORD]`
- [ ] Change the admin password immediately via the admin Settings tab
- [ ] Upload a hero image for the homepage → click ★ HERO on it
- [ ] Upload photos and assign them to chapters
- [ ] Optionally set a cover image for each chapter (shown as intro screen before the grid)
- [ ] Navigate to `/portfolio.html` and confirm the carousel displays correctly

### Step 6 — Test before sharing

- [ ] Test the contact form sends an email to `[CONTACT_EMAIL]`
- [ ] Test on iPhone (Safari) — check carousel touch interaction
- [ ] Test on Android (Chrome) — confirm responsive layout
- [ ] Test that the admin panel is only accessible when logged in
- [ ] Test that deleted images are removed from the display correctly
- [ ] Confirm Cloudinary images load (check Network tab — should be Cloudinary URLs)

---

## QUICK REFERENCE

### Default admin credentials

```
URL:      /admin.html
Username: [ADMIN_USERNAME]
Password: [ADMIN_PASSWORD]
```

**Change the password immediately after first login.**

### Default chapters (edit in database.js before first deploy)

```
Chapter 1: [CHAPTER_1]  slug: [chapter-1]
Chapter 2: [CHAPTER_2]  slug: [chapter-2]
Chapter 3: [CHAPTER_3]  slug: [chapter-3]
```

### Key routes

```
GET  /                 Homepage (index.html)
GET  /portfolio.html   Portfolio
GET  /admin.html       Admin panel
POST /auth/login       Login (sets cookie)
POST /auth/logout      Logout (clears cookie)
GET  /api/chapters     All chapters with metadata
GET  /api/chapters/:slug  Chapter + images
GET  /api/hero         Homepage hero image
POST /api/contact      Contact form → Resend email
```

---
