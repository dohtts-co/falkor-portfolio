const express = require('express');
const db      = require('../database');

const router = express.Router();

// ─── Contact form ─────────────────────────────────────────────
router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'NAME, EMAIL and MESSAGE are required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — contact form disabled');
    return res.status(503).json({ error: 'Contact form is not configured yet.' });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // NOTE: 'from' must stay as onboarding@resend.dev until a custom domain is
    // verified in the Resend dashboard (resend.com → Domains). Without a verified
    // domain, Resend only delivers to the account owner's email on the free plan.
    await resend.emails.send({
      from:    'FALKOR Contact <onboarding@resend.dev>',
      to:      process.env.CONTACT_EMAIL || 'falkorjp@gmail.com',
      replyTo: email,
      subject: `FALKOR — MESSAGE FROM ${name}`,
      text:    `Name: ${name}\nEmail: ${email}\n\n${message}`,
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
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

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
