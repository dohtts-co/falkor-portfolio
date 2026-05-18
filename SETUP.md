# FALKOR PORTFOLIO — SETUP

## Requirements
- Node.js 18+ (download from nodejs.org)

## First-time setup

```
cd "Dom Portfolio"
npm install
npm start
```

Then open: http://localhost:3000

## Admin panel
Go to: http://localhost:3000/admin.html

Default login:
- Username: `dom`
- Password: `falkor2026`

**Change the password after first login** via the Settings tab.

## Uploading photos
1. Log in to admin
2. Select a chapter (Shinjuku, Akihabara, etc.)
3. Drag & drop photos or click "SELECT FILES"
4. Click "UPLOAD SELECTED IMAGES"

## Setting the homepage hero image
1. Go to admin → Manage tab
2. Hover any image and click the ★ star button
3. That image becomes the full-screen entry photo

## Project structure
```
server.js          — backend server
database.js        — SQLite setup + default data
routes/
  auth.js          — login/logout
  api.js           — public image/chapter API
  admin.js         — protected upload/manage
public/
  index.html       — homepage (entry screen)
  portfolio.html   — chapter grid + viewer
  about.html       — about page
  contact.html     — contact form
  admin.html       — admin panel
  css/styles.css   — site styles
  css/admin.css    — admin styles
  js/portfolio.js  — gallery logic
  js/admin.js      — admin logic
uploads/           — uploaded images (auto-created)
portfolio.db       — SQLite database (auto-created)
```
