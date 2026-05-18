const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/chapters', (req, res) => {
  const chapters = db.getChapters();
  const result = chapters.map(ch => {
    const images = db.getImagesByChapter(ch.id);
    return {
      ...ch,
      lead_image: images[0] || null,
      image_count: images.length,
    };
  });
  res.json(result);
});

router.get('/chapters/:slug', (req, res) => {
  const chapter = db.getChapterBySlug(req.params.slug);
  if (!chapter) return res.status(404).json({ error: 'Not found' });
  const images = db.getImagesByChapter(chapter.id);
  res.json({ ...chapter, images });
});

router.get('/hero', (req, res) => {
  const heroId = db.getHeroImageId();
  if (!heroId) return res.json(null);
  const image = db.getImageById(heroId);
  res.json(image || null);
});

router.get('/images', (req, res) => {
  res.json(db.getImages());
});

module.exports = router;
