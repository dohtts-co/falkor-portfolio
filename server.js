require('dotenv').config();
const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');
const db           = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Cloudinary URL redirect ───────────────────────────────────────────────────
// When an image is stored on Cloudinary its `filename` field is the full
// secure_url (https://res.cloudinary.com/...).  The frontend renders every
// image as  `/${img.filename}`, producing a path like
// `/https://res.cloudinary.com/...`.  This middleware intercepts that pattern
// and issues a 302 redirect to the real Cloudinary URL before Express tries
// to serve it as a local file.
// Local images (uploads/ and public/photos/) are not affected — their paths
// don't start with /http.
app.use((req, res, next) => {
  const raw = decodeURIComponent(req.path);
  if (raw.startsWith('/https://') || raw.startsWith('/http://')) {
    return res.redirect(302, raw.slice(1)); // strip the leading /
  }
  next();
});

// ── Static files ──────────────────────────────────────────────────────────────
// Mounted before the data gate so images and pages never wait on the store.
// public/ is also the static root on Vercel, where these are served straight
// from the CDN and never reach this process.
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));  // local-disk upload mode

// ── Data gate ─────────────────────────────────────────────────────────────────
// The store loads asynchronously in Supabase mode, so requests wait for it.
// Writes queued during a handler are flushed before the response is sent — a
// serverless instance can be frozen the moment it replies, and an un-awaited
// write would never land.
app.use(async (req, res, next) => {
  try {
    await db.ready({ fresh: req.method !== 'GET' });
  } catch (err) {
    console.error('[db] load failed:', err.message);
    return res.status(503).json({ error: 'Store unavailable. Please try again.' });
  }

  const sendJson = res.json.bind(res);
  res.json = (body) => {
    db.flush().then(
      () => sendJson(body),
      (err) => {
        console.error('[db] save failed:', err.message);
        res.status(500);
        sendJson({ error: 'Could not save changes. Please try again.' });
      },
    );
    return res;
  };
  next();
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api',       require('./routes/api'));
app.use('/auth',      require('./routes/auth'));
app.use('/admin/api', require('./routes/admin'));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    // On Vercel the HTML is a CDN asset, not necessarily inside the function
    // bundle — fall back to the statically served homepage rather than erroring.
    if (err && !res.headersSent) res.redirect('/');
  });
});

// Only listen when run directly — on Vercel the app is imported by api/index.js.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  FALKOR PORTFOLIO running at http://localhost:${PORT}`);
    console.log(`  Admin panel:  http://localhost:${PORT}/admin.html`);
    console.log(`  Store:        ${db.mode}`);
    console.log(`  Default login: dom / falkor2026\n`);
  });
}

module.exports = app;
