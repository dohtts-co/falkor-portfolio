const express = require('express');
const db      = require('../database');

const router = express.Router();

router.get('/chapters', (req, res) => {
  const chapters = db.getChapters();
  const result   = chapters.map(ch => {
    const images     = db.getImagesByChapter(ch.id);
    const heroImage  = ch.chapter_hero_image_id ? db.getImageById(ch.chapter_hero_image_id) : null;
    return {
      ...ch,
      lead_image:  images[0] || null,   // first by sort_order — used as tile cover fallback
      hero_image:  heroImage,           // designated sub-hero for the chapter intro screen
      image_count: images.length,
    };
  });
  res.json(result);
});

router.get('/chapters/:slug', (req, res) => {
  const chapter = db.getChapterBySlug(req.params.slug);
  if (!chapter) return res.status(404).json({ error: 'Not found' });
  const images    = db.getImagesByChapter(chapter.id);
  const heroImage = chapter.chapter_hero_image_id ? db.getImageById(chapter.chapter_hero_image_id) : null;
  res.json({ ...chapter, hero_image: heroImage, images });
});

router.get('/hero', (req, res) => {
  const heroId = db.getHeroImageId();
  if (!heroId) return res.json(null);
  res.json(db.getImageById(heroId) || null);
});

router.get('/images', (req, res) => {
  res.json(db.getImages());
});

module.exports = router;
