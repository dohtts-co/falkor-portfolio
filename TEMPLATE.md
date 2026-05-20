# FALKOR PORTFOLIO — COMPLETE BUILD TEMPLATE

A full reference for replicating this photography portfolio from scratch.
Every architectural decision, code pattern, design rule, and deployment step
is documented here. You can build a new version for any photographer by
following this document top to bottom.

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
12. [Deployment — Railway](#12-deployment--railway)
13. [Services Setup](#13-services-setup)
14. [Replication Checklist](#14-replication-checklist)

---

## 1. TECH STACK

### Why these choices

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js + Express | Minimal, no compile step, runs anywhere |
| Database | Flat JSON file (`data.json`) | No native binary dependencies — crucial for Windows dev and Railway deploy. Avoids SQLite compilation issues. |
| Auth | JWT in HTTP-only cookies | Secure, stateless, no session store needed |
| Passwords | bcryptjs | Pure JavaScript — no native bindings |
| Image storage | Cloudinary (production) / local `uploads/` (dev) | Same frontend code works for both via redirect middleware |
| Upload handler | multer + multer-storage-cloudinary@4 | Works with cloudinary@^1.x (v2 has breaking API changes) |
| Email | Resend npm package | 100 emails/day free, dead simple API |
| Frontend | Vanilla HTML + CSS + JS | Zero build step — save and refresh is all that's needed |
| Fonts | Inter via Google Fonts | Clean, geometric, loads externally — no self-hosting needed |
| Deployment | Railway | Git-push deploy, persistent volume, env vars UI, free tier available |
| CDN for images | Cloudinary (free tier 25 GB storage) | Handles resizing, optimisation, and global delivery |

### Package versions that matter

```json
{
  "cloudinary": "^1.41.3",
  "multer-storage-cloudinary": "^4.0.0",
  "resend": "^3.5.0"
}
```

> **Critical:** `multer-storage-cloudinary@4` requires `cloudinary@^1.x`.
> Do NOT upgrade cloudinary to v2 — the peer dependency will break.

---

## 2. PROJECT FILE STRUCTURE

```
portfolio-root/
│
├── server.js               ← Express app entry point
├── database.js             ← Flat JSON database (all reads/writes)
├── package.json
├── railway.json            ← Railway deployment config
├── .env                    ← Local environment variables (never commit)
├── .env.example            ← Template for env vars (safe to commit)
├── .gitignore
├── data.json               ← Live database (auto-created on first run)
│
├── middleware/
│   └── auth.js             ← JWT verification middleware
│
├── routes/
│   ├── api.js              ← Public API (chapters, images, hero, contact)
│   ├── auth.js             ← Login/logout endpoints
│   └── admin.js            ← Protected admin API (upload, delete, manage)
│
├── public/                 ← All frontend files (served statically)
│   ├── index.html          ← Homepage (hero entry screen)
│   ├── portfolio.html      ← Portfolio page (carousel → grid → viewer)
│   ├── about.html          ← About page
│   ├── contact.html        ← Contact page (form + Instagram)
│   ├── admin.html          ← Admin panel (protected)
│   ├── css/
│   │   ├── styles.css      ← Main site styles
│   │   └── admin.css       ← Admin panel styles
│   └── js/
│       ├── portfolio.js    ← Portfolio carousel/grid/viewer logic
│       └── admin.js        ← Admin panel logic
│
└── uploads/                ← Local image storage (gitignored)
```

---

## 3. DESIGN SYSTEM

All of this lives in `public/css/styles.css` as CSS variables:

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
```

### Rules that define the aesthetic

- **Black background everywhere.** `#000` or `#0a0a0a`. Never grey.
- **White text only.** Varying opacity for hierarchy.
- **Everything all caps.** `text-transform: uppercase` or hardcoded in HTML.
- **Inter font, weights 200/300/400/900.** Load all four from Google Fonts.
- **No borders, no cards, no boxes** on the public site. Borders only on inputs and the ENTER button.
- **Letter spacing is the hierarchy tool.** Titles: `0.35em+`. Body: `0.15–0.25em`. Buttons: `0.4–0.5em`.
- **Font sizes are tiny.** Navigation: `11–13px`. Body: `11–13px`. The photography is the visual, not the type.
- **Transitions: 0.2–0.4s ease.** Never bounce, never spring.

### Google Fonts load (put this in every HTML `<head>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;900&display=swap" rel="stylesheet" />
```

---

## 4. ENVIRONMENT VARIABLES

### `.env` (local, never commit)

```bash
PORT=3000
JWT_SECRET=replace_with_a_long_random_string_minimum_32_chars

# Cloudinary — leave blank to use local disk storage in dev
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Database path — leave blank locally (uses ./data.json)
# On Railway set to: /data/data.json
DATA_PATH=

# Resend — for contact form emails
RESEND_API_KEY=
CONTACT_EMAIL=your@email.com
```

### `.env.example` (commit this — documents vars without secrets)

Same as above but with placeholder values and explanatory comments.

### `.gitignore`

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

// ── Cloudinary URL redirect ────────────────────────────────────
// Frontend renders every image as `/${img.filename}`.
// When filename is a full Cloudinary URL, the path becomes
// `/https://res.cloudinary.com/...` which needs redirecting.
// This middleware catches that before static file serving.
app.use((req, res, next) => {
  const raw = decodeURIComponent(req.path);
  if (raw.startsWith('/https://') || raw.startsWith('/http://')) {
    return res.redirect(302, raw.slice(1));
  }
  next();
});

// ── Static files ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api',       require('./routes/api'));
app.use('/auth',      require('./routes/auth'));
app.use('/admin/api', require('./routes/admin'));

// ── SPA fallback ──────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
```

---

## 6. BACKEND — database.js

The entire database is one JSON file. This avoids native binary compilation
issues on Windows and works seamlessly on Railway with a persistent volume.

### Key schema

```json
{
  "_next_image_id": 1,
  "_next_chapter_id": 4,
  "chapters": [
    {
      "id": 1,
      "name": "PORTRAIT",
      "slug": "portrait",
      "sort_order": 0,
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
    "username": "dom",
    "password_hash": "$2a$10$..."
  }
}
```

### Critical pattern — `filename` field stores either:
- A local path: `"uploads/abc123.jpg"` → served as `GET /uploads/abc123.jpg`
- A Cloudinary URL: `"https://res.cloudinary.com/..."` → server.js redirect handles it

Frontend always uses `/${img.filename}`. The redirect middleware makes both
cases transparent.

### Migration function

Run on every startup to add new fields without breaking existing data:

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

---

## 7. BACKEND — Routes

### routes/api.js (public, no auth)

```javascript
// GET /api/chapters
// Returns all chapters with lead_image, hero_image, image_count
router.get('/chapters', (req, res) => {
  const chapters = db.getChapters();
  const result = chapters.map(ch => {
    const images    = db.getImagesByChapter(ch.id);
    const heroImage = ch.chapter_hero_image_id
      ? db.getImageById(ch.chapter_hero_image_id) : null;
    return {
      ...ch,
      lead_image:  images[0] || null,
      hero_image:  heroImage,
      image_count: images.length,
    };
  });
  res.json(result);
});

// GET /api/chapters/:slug
// Returns chapter + hero_image + full images array
router.get('/chapters/:slug', (req, res) => {
  const chapter = db.getChapterBySlug(req.params.slug);
  if (!chapter) return res.status(404).json({ error: 'Not found' });
  const images    = db.getImagesByChapter(chapter.id);
  const heroImage = chapter.chapter_hero_image_id
    ? db.getImageById(chapter.chapter_hero_image_id) : null;
  res.json({ ...chapter, hero_image: heroImage, images });
});

// GET /api/hero — returns the designated homepage hero image
router.get('/hero', (req, res) => {
  const heroId = db.getHeroImageId();
  if (!heroId) return res.json(null);
  res.json(db.getImageById(heroId) || null);
});

// POST /api/contact — Resend email
router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message)
    return res.status(400).json({ error: 'All fields required.' });
  if (!process.env.RESEND_API_KEY)
    return res.status(503).json({ error: 'Contact form not configured.' });

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      // NOTE: replace onboarding@resend.dev with a verified custom domain
      // address once you verify a domain in your Resend dashboard.
      // Without this, Resend free plan only delivers to the account owner.
      from:    'Portfolio Contact <onboarding@resend.dev>',
      to:      process.env.CONTACT_EMAIL || 'your@email.com',
      replyTo: email,
      subject: `PORTFOLIO — MESSAGE FROM ${name}`,
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
```

### routes/auth.js (login / logout)

```javascript
// POST /auth/login  — body: { username, password }
// Sets httpOnly cookie 'token' with signed JWT on success
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = db.getAdmin();
  if (username !== admin.username) return res.status(401).json({ error: 'Invalid' });
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid' });
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});
```

### middleware/auth.js

```javascript
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
};
```

### routes/admin.js — Cloudinary vs local upload pattern

```javascript
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET
);

let upload;
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'portfolio', allowed_formats: ['jpg','jpeg','png','webp'] },
  });
  upload = multer({ storage });
} else {
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

// After upload, extract filename:
// Cloudinary:  filename = file.path (the full secure_url)
//              cloudinary_public_id = file.filename
// Local:       filename = 'uploads/' + file.filename
//              cloudinary_public_id = null
```

---

## 8. FRONTEND — Pages

### index.html — Homepage entry screen

The full-bleed hero with an animated ENTER button. The hero image is fetched
from `GET /api/hero` after page load. If no hero is set, the black background
shows. On ENTER click, the entry screen fades out and the main site fades in.

Key elements:
- `#entry-screen` — fixed overlay, z-index 100
- `#hero-image-container` — absolute, full bleed, contains `<img>` + gradient `::after`
- `#entry-text` — centred text group with backdrop-filter blur
- `#site.hidden` — the actual site, shown after ENTER

### portfolio.html — 3-stage portfolio experience

**Stage 1** — Custom 3D carousel (`#chapters-carousel-view`)
- Three cards always visible (left, centre, right)
- Ghost split-word typography behind the cards
- Clicking centre card → Stage 2
- Clicking side card → rotates carousel
- Nav arrows (← →) sit between the ghost word and the cards

**Stage 2** — Image grid (`#chapter-grid-view`)
- Multi-column photo grid, all images for that chapter
- Clicking any photo → Stage 3
- ← BACK returns to carousel, re-centred on the same chapter

**Stage 3** — Fullscreen viewer (`#chapter-view`)
- Blurred colour background (same image, heavily filtered)
- Arrow navigation + keyboard + swipe
- ← BACK returns to grid

**Optional** — Chapter intro screen (`#chapter-intro`)
- Full-screen image reveal before entering the grid
- Only shown if the chapter has a `chapter_hero_image_id` set

### admin.html — Admin panel (password protected)

Three tabs:
- **MANAGE** — View all uploaded images, assign to chapters, set covers, set homepage hero, delete
- **UPLOAD** — Drag-and-drop or click-to-upload images, assign chapter on upload
- **CHAPTERS** — Create, rename, delete chapters

---

## 9. FRONTEND — CSS PATTERNS

### Nav (fixed, transparent gradient)

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
```

### Footer (fixed, transparent gradient)

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

### Hero legibility system — 5 layers

```css
/* Layer 1 — Radial gradient overlay on hero image */
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

/* Layer 3 — Backdrop blur on text container */
#entry-text {
  position: relative;
  z-index: 2;
  padding: 40px 48px;
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  background: rgba(0,0,0,0.08);
}

/* Layer 2 — Text shadow on all hero text */
.entry-name,
.entry-role,
.entry-tagline,
#enter-btn {
  text-shadow:
    0 1px 12px rgba(0,0,0,0.9),
    0 0  40px rgba(0,0,0,0.6);
}

/* Layer 4 — ENTER button treatment */
#enter-btn {
  border: 1px solid rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Layer 5 — Letter spacing (shadows need room to render) */
.entry-name    { font-weight: 400; letter-spacing: 0.4em; }
.entry-role    { font-weight: 300; letter-spacing: 0.45em; }
.entry-tagline { font-weight: 300; letter-spacing: 0.25em; }
```

### Fullscreen viewer with blurred colour background

```css
#image-viewer { position: relative; height: 100vh; overflow: hidden; }

/* Blurred colour bg — same image, heavy filter */
#viewer-blur-bg { position: absolute; inset: 0; z-index: 0; }
#viewer-blur-img {
  width: 100%; height: 100%;
  object-fit: cover;
  filter: blur(40px) brightness(0.35) saturate(1.6);
  transform: scale(1.08); /* hide blur edge halos */
}

/* Actual image sits above blur */
#viewer-image-wrap { position: relative; z-index: 1; }
```

### Chapter intro / sub-hero screen

```css
#chapter-intro {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}
#chapter-intro-bg-wrap { position: absolute; inset: 0; overflow: hidden; }
#chapter-intro-img { width: 100%; height: 100%; object-fit: cover; }
#chapter-intro-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
#chapter-intro-content { position: relative; z-index: 2; text-align: center; }
```

### Image grid (masonry-style)

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
```

### Contact form inputs — labels above, bottom border only

```css
.form-field { display: flex; flex-direction: column; gap: 10px; }

.form-field label {
  font-size: 10px;
  font-weight: 300;
  letter-spacing: 0.4em;
  color: rgba(255,255,255,0.4);
}

.form-field input,
.form-field textarea {
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  font-size: 11px;
  letter-spacing: 0.15em;
  padding: 8px 0;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
}
.form-field input:focus,
.form-field textarea:focus { border-bottom-color: #fff; }

/* White bg, black text submit button */
.submit-btn {
  background: #fff;
  color: #000;
  border: none;
  padding: 13px 36px;
  font-size: 11px;
  letter-spacing: 0.35em;
  cursor: pointer;
  transition: opacity 0.2s;
}
.submit-btn:hover { opacity: 0.85; }
```

---

## 10. FRONTEND — JavaScript PATTERNS

### Image src helper (handles both local and Cloudinary)

```javascript
function imgSrc(filename) {
  return filename.startsWith('http') ? filename : '/' + filename;
}
```

### Infinite loop modulo

```javascript
function mod(n, m) {
  return ((n % m) + m) % m;
}
// Use everywhere instead of % to handle negative indices correctly
// mod(-1, 3) = 2  ✓
// mod(3, 3)  = 0  ✓
```

### Split-word carousel typography

```javascript
// Split chapter name at midpoint — extra char goes to right half
// "PORTRAIT" (8) → ["PORT", "RAIT"]
// "STREETS"  (7) → ["STR",  "EETS"]
function splitWord(name) {
  const s = name.toUpperCase();
  const mid = Math.floor(s.length / 2);
  return [s.slice(0, mid), s.slice(mid)];
}

// Crossfade the ghost word during rotation (200ms out + 200ms in)
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

### Carousel rotation — key principle

The entering card must commit its starting position before the transition fires.
Use `void card.offsetWidth` to force a browser reflow between setting the initial
class and setting the final class. Without this, the browser may skip the
transition and jump straight to the end state.

```javascript
function rotate(dir) {
  if (isAnimating) return;
  isAnimating = true;

  // Create entering card at off-screen start position
  const enterCard = makeCard(chapters[enterIdx]);
  enterCard.classList.add('c-pos-offscreen-left'); // or right
  track.appendChild(enterCard);

  void enterCard.offsetWidth; // ← CRITICAL: forces reflow

  // NOW change all classes simultaneously — transition fires
  leftCard.classList.replace('c-pos-left', 'c-pos-center');
  centerCard.classList.replace('c-pos-center', 'c-pos-right');
  rightCard.classList.replace('c-pos-right', 'c-pos-offscreen-right');
  enterCard.classList.replace('c-pos-offscreen-left', 'c-pos-left');

  // Clean up after transition completes
  setTimeout(() => { rightCard.remove(); isAnimating = false; }, 450);
}
```

### Carousel card position CSS classes

```css
.c-card {
  position: absolute;
  left: 50%; top: 50%;
  width: 320px; height: 460px;
  margin-left: -160px; margin-top: -230px;
  background-size: cover; background-position: center;
  transition: transform 0.4s ease, filter 0.4s ease, opacity 0.4s ease;
}

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
.c-pos-offscreen-left {
  transform: perspective(1000px) translateX(-560px) rotateY(40deg) scale(0.6);
  opacity: 0; z-index: 1; pointer-events: none;
}
.c-pos-offscreen-right {
  transform: perspective(1000px) translateX(560px) rotateY(-40deg) scale(0.6);
  opacity: 0; z-index: 1; pointer-events: none;
}
```

### Stage navigation pattern

All views are hidden/shown with `.hidden { display: none !important }`.
Never remove DOM elements from the page — just toggle visibility.

```javascript
// Going into chapter from carousel
function openChapter(slug) {
  document.getElementById('chapters-carousel-view').classList.add('hidden');
  document.getElementById('nav').classList.add('hidden'); // ← hide nav in chapter views
  // show grid or intro...
}

// Returning to carousel
function showChapters() {
  document.getElementById('chapter-grid-view').classList.add('hidden');
  document.getElementById('chapters-carousel-view').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden'); // ← restore nav
  buildCarousel(); // also restores split word text
}
```

### Contact form — POST with success/fail handling

```javascript
async function submitForm(e) {
  e.preventDefault();
  const btn  = document.getElementById('submit-btn');
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  btn.disabled = true;
  btn.textContent = 'SENDING';

  try {
    const res  = await fetch('/api/contact', {
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
      form.classList.add('hidden');       // hide the form
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

### Chapter / sub-hero system

Each chapter has a `chapter_hero_image_id` field. If set, clicking the chapter
in the carousel first shows a full-screen intro screen with that image before
entering the photo grid. To set/change a chapter's cover image, go to the
admin panel → MANAGE tab → click ☆ COVER on any image in that chapter.

### Homepage hero image

The main homepage full-bleed background is a single designated image stored as
`settings.hero_image_id`. To set it: admin panel → MANAGE tab → click ★ HERO
on any image. Only one image can be the hero at a time.

### Cloudinary URL transparency trick

The server has a one-line redirect middleware that catches paths starting with
`/https://` and redirects to the actual URL. This means:

- Local dev: images stored as `uploads/abc.jpg`, served as `/uploads/abc.jpg`
- Production: images stored as `https://res.cloudinary.com/...`, served via redirect

The frontend code is **identical** for both environments. No environment checks
in JavaScript. The server handles the translation invisibly.

### Railway persistent volume

Railway ephemeral filesystem resets on every deploy. To persist `data.json`:
1. Add a Volume in Railway dashboard (Storage section)
2. Mount path: `/data`
3. Set env var `DATA_PATH=/data/data.json`
4. On first deploy: use Railway shell to `cp data.json /data/data.json`

After that, `data.json` persists across deploys automatically.

### Admin authentication flow

1. `GET /admin.html` — loads the admin page (no server-side protection)
2. Admin page JavaScript checks `GET /admin/api/check` — returns 401 if no cookie
3. On 401, admin.js shows the login form
4. `POST /auth/login` — sets httpOnly JWT cookie
5. All subsequent `admin/api/*` requests carry the cookie automatically
6. `POST /auth/logout` — clears the cookie

The `httpOnly` cookie means JavaScript cannot read or steal the token.

---

## 12. DEPLOYMENT — Railway

### One-time setup

1. Push code to GitHub
2. railway.com → New Project → Deploy from GitHub repo
3. Add variables in Railway → Variables tab:
   ```
   JWT_SECRET         = (generate a random 64-char string)
   CLOUDINARY_CLOUD_NAME
   CLOUDINARY_API_KEY
   CLOUDINARY_API_SECRET
   DATA_PATH          = /data/data.json
   RESEND_API_KEY
   CONTACT_EMAIL      = your@email.com
   ```
4. Railway → Storage → Add Volume → Mount at `/data`
5. Railway → Settings → Networking → Generate Domain

### railway.json

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Auto-deploy

Every `git push origin main` triggers a Railway redeploy automatically.
No manual steps needed after initial setup.

### Seed data on first Railway deploy

Open Railway shell (service → Settings → Railway Shell) and run:
```bash
cp data.json /data/data.json
```

This copies your local data (with default chapters) into the persistent volume.
Only needed once. After that, all data lives in `/data/data.json`.

---

## 13. SERVICES SETUP

### Cloudinary (free tier — 25 GB)

1. cloudinary.com → Sign up
2. Dashboard → Settings → Access Keys
3. Copy: Cloud Name, API Key, API Secret
4. Paste into Railway variables

### Resend (email — 100 emails/day free)

1. resend.com → Sign up
2. API Keys → Create API Key → copy it
3. Paste into Railway as `RESEND_API_KEY`
4. The `from` address starts as `onboarding@resend.dev` (Resend default)
5. To use a custom from address (e.g. `hello@falkor.ae`):
   - Resend dashboard → Domains → Add Domain
   - Add DNS records to your domain registrar
   - Once verified, change the `from` field in `routes/api.js`

### Railway (free tier)

- 500 hours/month of runtime (enough for one always-on service)
- 1 GB persistent volume included
- Custom domain: Settings → Networking → Custom Domain

---

## 14. REPLICATION CHECKLIST

Use this list to build a fresh portfolio for a new photographer:

### Initial setup
- [ ] Copy this project, remove `data.json`, `uploads/`, `photos/`
- [ ] Update `database.js` DEFAULT_DATA — change chapter names and slugs to match the new photographer's work
- [ ] Update admin username and default password in DEFAULT_DATA
- [ ] Find/replace "FALKOR" with the new photographer's name across all HTML files
- [ ] Update footer text (name · city · year) in all HTML files
- [ ] Update `<title>` tags in all HTML files
- [ ] Update homepage tagline in `index.html`
- [ ] Update about page text in `about.html`
- [ ] Update Instagram handle in `contact.html`
- [ ] Update `CONTACT_EMAIL` in `.env` and Railway variables

### Services
- [ ] Create new Cloudinary account (or use existing, different folder)
- [ ] Create new Resend account (or use existing, different API key)
- [ ] Create new Railway project
- [ ] Add all environment variables to Railway

### Design customisation (optional)
- [ ] Change font in Google Fonts link and `--font` CSS variable
- [ ] Adjust `--white` opacity values for different tonal feel
- [ ] Change letter-spacing values for different typographic character
- [ ] Change carousel card sizes (320×460px default)
- [ ] Change image grid column count (3 desktop, 2 mobile default)
- [ ] Change blur intensity on fullscreen viewer (`blur(40px)` default)

### Launch
- [ ] Push to GitHub
- [ ] Confirm Railway deploy succeeds
- [ ] Seed data: `cp data.json /data/data.json` in Railway shell
- [ ] Log into admin panel, upload hero image, set it as homepage hero
- [ ] Upload photos, assign to chapters
- [ ] Set a cover image for each chapter (optional sub-hero effect)
- [ ] Test contact form sends email
- [ ] Test on mobile (iOS Safari + Android Chrome)

---

## QUICK REFERENCE — Default login

```
URL:      /admin.html
Username: dom
Password: falkor2026
```

Change the password immediately after first login via the admin panel
Settings tab, or by directly editing `DEFAULT_DATA` in `database.js`
before first deploy.

---

