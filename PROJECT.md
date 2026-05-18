# FALKOR — Portfolio Website
**Dom Arkezaq · @falkor_ae**

---

## What Was Built

A full photography portfolio website with a hidden admin panel. Black background, all-caps, Inter font throughout. No frameworks — plain HTML, CSS, JavaScript on the front end, Node.js + Express on the back end.

---

## Pages

| Page | File | Purpose |
|---|---|---|
| Homepage | `public/index.html` | Full-screen hero image + ENTER gate |
| Portfolio | `public/portfolio.html` | Chapter grid → image viewer |
| About | `public/about.html` | Bio, camera, Instagram link |
| Contact | `public/contact.html` | Instagram DM only (@falkor_ae) |
| Admin | `public/admin.html` | Hidden management panel |

---

## Running the Site Locally

```bash
npm install
npm start
```

Then open: **http://localhost:3000**

| URL | Page |
|---|---|
| http://localhost:3000 | Homepage |
| http://localhost:3000/portfolio.html | Portfolio |
| http://localhost:3000/about.html | About |
| http://localhost:3000/contact.html | Contact |
| http://localhost:3000/admin.html | Admin panel |

---

## Admin Panel

**Default login:** `dom` / `falkor2026`

The admin is accessible via the small link in the footer of every page. It has three tabs:

### Upload Tab
- Drag & drop or select image files (JPG, PNG, WEBP — max 30MB each)
- Assign to a chapter before uploading
- Supports batch uploads (up to 20 at once)
- Progress bar shows upload status

### Manage Tab
- All images grouped by chapter
- Each card has a hover overlay with three inline controls:
  - **☆ SET HERO** — makes that image the homepage full-screen hero
  - **Chapter dropdown** — moves the image to a different chapter instantly
  - **DELETE** — removes the image from the database and disk
- No page reloads needed — all changes apply immediately

### Settings Tab
- Change admin password
- Preview the current hero image
- Link to the live site

---

## Project Structure

```
Dom Portfolio/
│
├── server.js              # Express server, routes, static file serving
├── database.js            # JSON file database (read/write data.json)
├── data.json              # All data: chapters, images, hero setting, admin hash
├── package.json           # Dependencies
├── .env                   # JWT secret (keep private, never commit)
│
├── routes/
│   ├── api.js             # Public API endpoints
│   ├── auth.js            # Login / logout / token check
│   └── admin.js           # Protected upload / manage endpoints
│
├── middleware/
│   └── auth.js            # JWT verification for admin routes
│
├── public/
│   ├── index.html         # Homepage
│   ├── portfolio.html     # Portfolio page
│   ├── about.html         # About page
│   ├── contact.html       # Contact page
│   ├── admin.html         # Admin panel
│   ├── css/
│   │   ├── styles.css     # Main site styles
│   │   └── admin.css      # Admin panel styles
│   └── js/
│       ├── portfolio.js   # Chapter grid, image viewer, keyboard/swipe nav
│       └── admin.js       # All admin panel logic
│
├── photos/                # Pre-loaded photo library (committed to repo)
│   ├── highlight picture.jpg          # Default homepage hero
│   ├── portrait/
│   │   ├── portrait highlight photo.jpg
│   │   └── portait 1.jpg … portait 8b.jpg
│   ├── people in street/
│   │   ├── street highlight photo.jpg
│   │   └── 1-IMG_5262.jpg … (all street photos)
│   └── tokyo highlight photo.jpg
│       └── (car photos, misc Tokyo shots)
│
└── uploads/               # Admin-uploaded images land here (do NOT commit)
```

---

## Database

No SQL. All data lives in `data.json` — a flat JSON file that acts as the database. It stores:

- **Chapters** — id, name, slug, sort order
- **Images** — id, filename path, original name, chapter assignment, sort order, hero flag
- **Hero image ID** — which image shows on the homepage
- **Admin credentials** — bcrypt-hashed password

The three chapters pre-configured:
| ID | Name | Slug |
|---|---|---|
| 1 | PORTRAIT | portrait |
| 2 | STREETS | streets |
| 3 | TOKYO | tokyo |

---

## API Endpoints

### Public (no auth needed)
| Method | Route | Returns |
|---|---|---|
| GET | `/api/chapters` | All chapters |
| GET | `/api/chapters/:slug` | Chapter + its images |
| GET | `/api/hero` | Current hero image |
| GET | `/api/images` | All images |

### Auth
| Method | Route | Action |
|---|---|---|
| POST | `/auth/login` | Returns JWT token |
| POST | `/auth/logout` | Clears session |
| GET | `/auth/check` | Validates token |

### Admin (requires JWT)
| Method | Route | Action |
|---|---|---|
| POST | `/admin/api/upload` | Upload images (multipart) |
| GET | `/admin/api/images` | All images with chapter info |
| PATCH | `/admin/api/images/:id` | Update chapter / order / hero |
| DELETE | `/admin/api/images/:id` | Delete image + file from disk |
| GET | `/admin/api/chapters` | All chapters |
| POST | `/admin/api/change-password` | Update admin password |

---

## Image Path Convention

Images are stored with their path relative to the project root:

- Pre-loaded photos: `photos/portrait/portait 1.jpg`
- Admin uploads: `uploads/1779064231148-129614.jpg`

The frontend always builds URLs as `/${img.filename}` — the server serves both folders statically so both paths resolve correctly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Server | Express |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File uploads | Multer |
| Database | JSON file (data.json) — no native deps |
| Frontend | Vanilla HTML / CSS / JS |
| Font | Inter (Google Fonts) |

No SQLite, no React, no build step. The JSON database was chosen specifically to avoid native C++ compilation issues on Windows.

---

## Deploying Live

GitHub alone does not host the site — it only stores the code. You need a platform that can run Node.js.

**Recommended: Railway (railway.app)**
1. Push code to a GitHub repository (private recommended)
2. Sign in to Railway with GitHub
3. New Project → Deploy from GitHub repo → select your repo
4. Railway detects Node.js automatically and runs `npm start`
5. You get a public URL instantly

**Before pushing to GitHub, create a `.gitignore`:**
```
node_modules/
uploads/
.env
```

> Note: the `uploads/` folder (admin-uploaded images) will not persist across Railway redeploys. The `photos/` folder is committed to the repo so those are always safe.

---

## Changing the Admin Password

Either through the admin panel Settings tab, or directly in `data.json` by running:

```js
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('YOUR_NEW_PASSWORD', 10));
```

Paste the output hash into `data.json` → `admin.password_hash`.

---

## Key Design Decisions

- **Black background (#0a0a0a), white text, Inter font** — minimal, no colour
- **All uppercase** — consistent throughout site and admin
- **3-column portrait grid** for chapter covers with hover scale + brightness animation
- **Full-screen image viewer** with blurred background, keyboard (←/→/Esc) and swipe navigation
- **No contact form** — Instagram DM only (@falkor_ae)
- **No day counters or dates** on the about page
- **Admin is hidden** — accessible only via small footer link, not in main nav
