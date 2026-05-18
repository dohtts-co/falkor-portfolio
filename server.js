require('dotenv').config();
const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');

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
// Local images (uploads/ and photos/) are not affected — their paths don't
// start with /http.
app.use((req, res, next) => {
  const raw = decodeURIComponent(req.path);
  if (raw.startsWith('/https://') || raw.startsWith('/http://')) {
    return res.redirect(302, raw.slice(1)); // strip the leading /
  }
  next();
});

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/photos',  express.static(path.join(__dirname, 'photos')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));          // serves preview.html

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api',       require('./routes/api'));
app.use('/auth',      require('./routes/auth'));
app.use('/admin/api', require('./routes/admin'));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  FALKOR PORTFOLIO running at http://localhost:${PORT}`);
  console.log(`  Admin panel:  http://localhost:${PORT}/admin.html`);
  console.log(`  Default login: dom / falkor2026\n`);
});
