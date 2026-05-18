const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// ── Path ──────────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DATA_PATH || path.join(__dirname, 'data.json');
const dbDir   = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  chapters: [
    { id: 1, name: 'PORTRAIT', slug: 'portrait', sort_order: 0, chapter_hero_image_id: null },
    { id: 2, name: 'STREETS',  slug: 'streets',  sort_order: 1, chapter_hero_image_id: null },
    { id: 3, name: 'TOKYO',    slug: 'tokyo',    sort_order: 2, chapter_hero_image_id: null },
  ],
  images: [],
  settings: { hero_image_id: null },
  admin: {
    id: 1,
    username: 'dom',
    password_hash: bcrypt.hashSync('falkor2026', 10),
  },
  _next_image_id:   1,
  _next_chapter_id: 4,
};

let data;

function load() {
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      migrate();
      return;
    } catch (e) {
      console.error('[db] Failed to parse data file, using defaults:', e.message);
    }
  }
  data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  save();
}

// Forward-compatible migrations — safe to run on every load
function migrate() {
  // Add _next_chapter_id if missing (older data.json)
  if (!data._next_chapter_id) {
    const maxId = data.chapters.length ? Math.max(...data.chapters.map(c => c.id)) : 0;
    data._next_chapter_id = maxId + 1;
  }
  // Add chapter_hero_image_id to existing chapters that don't have it
  data.chapters.forEach(ch => {
    if (ch.chapter_hero_image_id === undefined) ch.chapter_hero_image_id = null;
  });
  // Add cloudinary_public_id to existing images that don't have it
  data.images.forEach(img => {
    if (img.cloudinary_public_id === undefined) img.cloudinary_public_id = null;
  });
  save();
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

load();

// ── Public API ────────────────────────────────────────────────────────────────
const db = {

  // ── Chapters ──────────────────────────────────────────────────────────────
  getChapters() {
    return [...data.chapters].sort((a, b) => a.sort_order - b.sort_order);
  },

  getChapterBySlug(slug) {
    return data.chapters.find(c => c.slug === slug) || null;
  },

  getChapterById(id) {
    return data.chapters.find(c => c.id === id) || null;
  },

  insertChapter({ name, slug, sort_order }) {
    const id = data._next_chapter_id++;
    const chapter = { id, name, slug, sort_order: sort_order ?? data.chapters.length, chapter_hero_image_id: null };
    data.chapters.push(chapter);
    save();
    return chapter;
  },

  updateChapter(id, fields) {
    const idx = data.chapters.findIndex(c => c.id === id);
    if (idx === -1) return null;
    data.chapters[idx] = { ...data.chapters[idx], ...fields };
    save();
    return data.chapters[idx];
  },

  deleteChapter(id) {
    const idx = data.chapters.findIndex(c => c.id === id);
    if (idx === -1) return false;
    data.chapters.splice(idx, 1);
    // Unassign all images that belonged to this chapter
    data.images.forEach(img => {
      if (img.chapter_id === id) img.chapter_id = null;
    });
    save();
    return true;
  },

  // ── Images ────────────────────────────────────────────────────────────────
  getImages() {
    return [...data.images].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getImagesByChapter(chapterId) {
    return data.images
      .filter(i => i.chapter_id === chapterId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  getImageById(id) {
    return data.images.find(i => i.id === id) || null;
  },

  insertImage({ filename, cloudinary_public_id = null, original_name, chapter_id, sort_order }) {
    const id = data._next_image_id++;
    const image = {
      id,
      filename,
      cloudinary_public_id,
      original_name: original_name || filename,
      chapter_id:    chapter_id || null,
      sort_order:    sort_order ?? 0,
      created_at:    new Date().toISOString(),
    };
    data.images.push(image);
    save();
    return image;
  },

  updateImage(id, fields) {
    const idx = data.images.findIndex(i => i.id === id);
    if (idx === -1) return null;
    data.images[idx] = { ...data.images[idx], ...fields };
    save();
    return data.images[idx];
  },

  deleteImage(id) {
    const idx = data.images.findIndex(i => i.id === id);
    if (idx === -1) return false;
    // Clear chapter hero if this image was it
    data.chapters.forEach(ch => {
      if (ch.chapter_hero_image_id === id) ch.chapter_hero_image_id = null;
    });
    data.images.splice(idx, 1);
    if (data.settings.hero_image_id === id) data.settings.hero_image_id = null;
    save();
    return true;
  },

  maxSortOrderForChapter(chapterId) {
    const imgs = data.images.filter(i => i.chapter_id === (chapterId || null));
    if (!imgs.length) return -1;
    return Math.max(...imgs.map(i => i.sort_order));
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getHeroImageId() { return data.settings.hero_image_id; },
  setHeroImageId(id) { data.settings.hero_image_id = id; save(); },

  // ── Admin ─────────────────────────────────────────────────────────────────
  getAdmin() { return { ...data.admin }; },
  updateAdminPassword(hash) { data.admin.password_hash = hash; save(); },
};

module.exports = db;
