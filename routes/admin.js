const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
const db      = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── Storage mode ──────────────────────────────────────────────────────────────
// Cloudinary is used when all three env vars are present.
// Falls back to local disk automatically so `npm start` works without any
// Cloudinary credentials during local development.
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET
);

// ── Cloudinary setup ──────────────────────────────────────────────────────────
let cloudinary;
let cloudinaryStorage;

if (useCloudinary) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          'falkor',
      resource_type:   'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
  });

  console.log('[upload] Storage: Cloudinary ☁️');
} else {
  console.log('[upload] Storage: local disk 💾  (set CLOUDINARY_* env vars to enable cloud storage)');
}

// ── Local disk setup (fallback) ───────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const localDiskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

// ── File filter (shared) ──────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk  = allowed.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Images only (jpg, png, webp)'), false);
};

// ── Multer instance ───────────────────────────────────────────────────────────
const upload = multer({
  storage:    useCloudinary ? cloudinaryStorage : localDiskStorage,
  limits:     { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter,
});

// ── POST /upload ──────────────────────────────────────────────────────────────
router.post('/upload', upload.array('images', 20), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

  const chapterId = req.body.chapter_id ? parseInt(req.body.chapter_id) : null;

  const inserted = req.files.map(file => {
    const maxOrder = db.maxSortOrderForChapter(chapterId);

    let filename;
    let cloudinary_public_id = null;

    if (useCloudinary) {
      // multer-storage-cloudinary sets:
      //   file.path     → secure_url  (https://res.cloudinary.com/...)
      //   file.filename → public_id   (falkor/abc123)
      filename             = file.path;
      cloudinary_public_id = file.filename;
    } else {
      // Local disk: store path relative to project root so the static
      // middleware at /uploads can serve it.
      filename = 'uploads/' + file.filename;
    }

    return db.insertImage({
      filename,
      cloudinary_public_id,
      original_name: file.originalname,
      chapter_id:    chapterId,
      sort_order:    maxOrder + 1,
    });
  });

  res.json({ uploaded: inserted });
});

// ── GET /images ───────────────────────────────────────────────────────────────
router.get('/images', (req, res) => {
  const chapters = db.getChapters();
  const images   = db.getImages().map(img => {
    const chapter = img.chapter_id
      ? chapters.find(c => c.id === img.chapter_id)
      : null;
    return {
      ...img,
      chapter_name: chapter?.name || null,
      chapter_slug: chapter?.slug || null,
    };
  });
  res.json(images);
});

// ── PATCH /images/:id ─────────────────────────────────────────────────────────
router.patch('/images/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { chapter_id, sort_order, is_hero } = req.body;

  if (is_hero !== undefined) {
    db.setHeroImageId(is_hero ? id : null);
  }

  const updates = {};
  if (chapter_id !== undefined) updates.chapter_id = chapter_id ? parseInt(chapter_id) : null;
  if (sort_order !== undefined) updates.sort_order  = parseInt(sort_order) || 0;

  if (Object.keys(updates).length) {
    const result = db.updateImage(id, updates);
    if (!result) return res.status(404).json({ error: 'Not found' });
  }

  res.json({ ok: true });
});

// ── DELETE /images/:id ────────────────────────────────────────────────────────
router.delete('/images/:id', async (req, res) => {
  const id    = parseInt(req.params.id);
  const image = db.getImageById(id);
  if (!image) return res.status(404).json({ error: 'Not found' });

  // 1. Delete from Cloudinary (cloud mode)
  if (useCloudinary && image.cloudinary_public_id) {
    try {
      await cloudinary.uploader.destroy(image.cloudinary_public_id);
    } catch (e) {
      // Log but don't block — still remove from DB
      console.error('[cloudinary] destroy failed:', e.message);
    }
  }

  // 2. Delete from local disk (local mode or pre-loaded photos).
  //    image.filename is relative to project root e.g. "uploads/abc.jpg"
  //    or "photos/portrait/portait 1.jpg".
  //    Skip if filename is a full Cloudinary URL.
  if (!image.filename.startsWith('http')) {
    const filePath = path.join(__dirname, '..', image.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {
        console.error('[fs] delete failed:', e.message);
      }
    }
  }

  db.deleteImage(id);
  res.json({ ok: true });
});

// ── GET /chapters ─────────────────────────────────────────────────────────────
router.get('/chapters', (req, res) => {
  res.json(db.getChapters());
});

// ── POST /change-password ─────────────────────────────────────────────────────
router.post('/change-password', (req, res) => {
  const { current_password, new_password } = req.body;
  const admin = db.getAdmin();

  if (!bcrypt.compareSync(current_password, admin.password_hash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  db.updateAdminPassword(bcrypt.hashSync(new_password, 10));
  res.json({ ok: true });
});

module.exports = router;
