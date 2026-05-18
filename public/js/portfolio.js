// ─── State ────────────────────────────────────────────────────
let visibleChapters    = [];
let centerIdx          = 0;
let isAnimating        = false;
let currentChapter     = null;
let currentIndex       = 0;
let carouselCenterSlug = null;

// ─── Helpers ──────────────────────────────────────────────────
function imgSrc(filename) {
  return filename.startsWith('http') ? filename : '/' + filename;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

// Split chapter name at midpoint.
// Even length → equal halves. Odd → extra char goes to right half.
// "PORTRAIT" (8) → ["PORT", "RAIT"]
// "STREETS"  (7) → ["STR",  "EETS"]
// "TOKYO"    (5) → ["TO",   "KYO"]
function splitWord(name) {
  const s   = name.toUpperCase();
  const mid = Math.floor(s.length / 2);
  return [s.slice(0, mid), s.slice(mid)];
}

// Update the ghost typographic word behind the carousel.
// animate=false → instant swap (used on first render / carousel rebuild)
// animate=true  → 200ms fade-out, text swap, 200ms fade-in (used during rotation)
function updateSplitWord(name, animate) {
  const leftEl  = document.getElementById('c-word-left');
  const rightEl = document.getElementById('c-word-right');
  if (!leftEl || !rightEl) return;

  const [left, right] = splitWord(name);

  if (!animate) {
    leftEl.textContent  = left;
    rightEl.textContent = right;
    leftEl.style.opacity  = '1';
    rightEl.style.opacity = '1';
    return;
  }

  // Fade out (CSS transition handles the 200ms)
  leftEl.style.opacity  = '0';
  rightEl.style.opacity = '0';

  // Swap text at the midpoint, then fade back in
  setTimeout(() => {
    leftEl.textContent  = left;
    rightEl.textContent = right;
    leftEl.style.opacity  = '1';
    rightEl.style.opacity = '1';
  }, 200);
}

// ─── Load & init ──────────────────────────────────────────────
async function loadChapters() {
  try {
    const res      = await fetch('/api/chapters');
    const chapters = await res.json();
    visibleChapters = chapters.filter(ch => ch.image_count > 0);

    if (!visibleChapters.length) {
      document.getElementById('no-images-notice').classList.remove('hidden');
      document.getElementById('c-stage').classList.add('hidden');
      return;
    }

    document.getElementById('no-images-notice').classList.add('hidden');
    buildCarousel();

    document.getElementById('c-prev').addEventListener('click', () => rotate(-1));
    document.getElementById('c-next').addEventListener('click', () => rotate(1));
    document.getElementById('c-track').addEventListener('click', onTrackClick);

    if (visibleChapters.length < 2) {
      document.getElementById('c-prev').style.visibility = 'hidden';
      document.getElementById('c-next').style.visibility = 'hidden';
    }
  } catch (e) {
    console.error('Failed to load chapters', e);
  }
}

// ─── Card factory ─────────────────────────────────────────────
function makeCard(chapter) {
  const card        = document.createElement('div');
  card.className    = 'c-card';
  card.dataset.slug = chapter.slug;

  const img = chapter.hero_image || chapter.lead_image;
  if (img) card.style.backgroundImage = `url('${imgSrc(img.filename)}')`;

  return card;
}

// ─── Build (or rebuild) carousel ─────────────────────────────
function buildCarousel() {
  const track = document.getElementById('c-track');
  track.innerHTML = '';

  const n = visibleChapters.length;

  [
    { ch: visibleChapters[mod(centerIdx - 1, n)], pos: 'left'   },
    { ch: visibleChapters[centerIdx],              pos: 'center' },
    { ch: visibleChapters[mod(centerIdx + 1, n)], pos: 'right'  },
  ].forEach(({ ch, pos }) => {
    const card = makeCard(ch);
    card.dataset.pos = pos;
    card.classList.add('c-pos-' + pos);
    track.appendChild(card);
  });

  // Set ghost word immediately (no animation)
  updateSplitWord(visibleChapters[centerIdx].name, false);
}

// ─── Click delegation on track ────────────────────────────────
function onTrackClick(e) {
  if (isAnimating) return;
  const card = e.target.closest('.c-card');
  if (!card) return;

  const pos = card.dataset.pos;
  if      (pos === 'center') openChapter(card.dataset.slug);
  else if (pos === 'left')   rotate(-1);
  else if (pos === 'right')  rotate(1);
}

// ─── Rotate carousel ──────────────────────────────────────────
// dir +1 = press RIGHT → left card → centre, centre → right, right exits
// dir -1 = press LEFT  → right card → centre, centre → left,  left exits
function rotate(dir) {
  if (isAnimating) return;
  const n = visibleChapters.length;
  if (n < 2) return;
  isAnimating = true;

  const track      = document.getElementById('c-track');
  const leftCard   = track.querySelector('[data-pos="left"]');
  const centerCard = track.querySelector('[data-pos="center"]');
  const rightCard  = track.querySelector('[data-pos="right"]');

  if (dir === 1) {
    // New centre = what was left
    const newCenter = visibleChapters[mod(centerIdx - 1, n)];
    updateSplitWord(newCenter.name, true);

    // Entering card slides in from off-screen left
    const enterCard = makeCard(visibleChapters[mod(centerIdx - 2, n)]);
    enterCard.dataset.pos = 'left';
    enterCard.classList.add('c-pos-offscreen-left');
    track.appendChild(enterCard);

    void enterCard.offsetWidth; // force reflow so initial position commits

    // Transition all four cards simultaneously
    leftCard.dataset.pos   = 'center';
    leftCard.classList.remove('c-pos-left');
    leftCard.classList.add('c-pos-center');

    centerCard.dataset.pos = 'right';
    centerCard.classList.remove('c-pos-center');
    centerCard.classList.add('c-pos-right');

    rightCard.dataset.pos  = 'exiting';
    rightCard.classList.remove('c-pos-right');
    rightCard.classList.add('c-pos-offscreen-right');

    enterCard.classList.remove('c-pos-offscreen-left');
    enterCard.classList.add('c-pos-left');

    centerIdx = mod(centerIdx - 1, n);

    setTimeout(() => { rightCard.remove(); isAnimating = false; }, 450);

  } else {
    // New centre = what was right
    const newCenter = visibleChapters[mod(centerIdx + 1, n)];
    updateSplitWord(newCenter.name, true);

    // Entering card slides in from off-screen right
    const enterCard = makeCard(visibleChapters[mod(centerIdx + 2, n)]);
    enterCard.dataset.pos = 'right';
    enterCard.classList.add('c-pos-offscreen-right');
    track.appendChild(enterCard);

    void enterCard.offsetWidth;

    rightCard.dataset.pos  = 'center';
    rightCard.classList.remove('c-pos-right');
    rightCard.classList.add('c-pos-center');

    centerCard.dataset.pos = 'left';
    centerCard.classList.remove('c-pos-center');
    centerCard.classList.add('c-pos-left');

    leftCard.dataset.pos   = 'exiting';
    leftCard.classList.remove('c-pos-left');
    leftCard.classList.add('c-pos-offscreen-left');

    enterCard.classList.remove('c-pos-offscreen-right');
    enterCard.classList.add('c-pos-right');

    centerIdx = mod(centerIdx + 1, n);

    setTimeout(() => { leftCard.remove(); isAnimating = false; }, 450);
  }
}

// ─── Stage 1 → 2 : Open chapter ──────────────────────────────
async function openChapter(slug) {
  carouselCenterSlug = slug;
  try {
    const res  = await fetch(`/api/chapters/${slug}`);
    const data = await res.json();
    if (!data.images?.length) return;

    currentChapter = data;
    currentIndex   = 0;

    if (data.hero_image) {
      showChapterIntro(data);
    } else {
      enterChapterImages();
    }
  } catch (e) {
    console.error('Failed to load chapter', e);
  }
}

// ─── Chapter intro screen ─────────────────────────────────────
function showChapterIntro(data) {
  document.getElementById('chapter-intro-img').src           = imgSrc(data.hero_image.filename);
  document.getElementById('chapter-intro-title').textContent = data.name;
  document.getElementById('chapters-carousel-view').classList.add('hidden');
  document.getElementById('nav').classList.add('hidden');
  document.getElementById('chapter-intro').classList.remove('hidden');
}

function enterChapterImages() {
  document.getElementById('chapter-intro').classList.add('hidden');
  document.getElementById('chapters-carousel-view').classList.add('hidden');
  document.getElementById('nav').classList.add('hidden');
  showImageGrid(currentChapter);
}

document.getElementById('chapter-intro-enter').addEventListener('click', enterChapterImages);

// ─── Stage 2 : Image grid ────────────────────────────────────
function showImageGrid(chapter) {
  document.getElementById('grid-chapter-title').textContent = chapter.name;

  const grid = document.getElementById('chapter-image-grid');
  grid.innerHTML = '';

  chapter.images.forEach((img, index) => {
    const el   = document.createElement('img');
    el.src     = imgSrc(img.filename);
    el.alt     = chapter.name;
    el.loading = 'lazy';
    el.onclick = () => openImageFromGrid(index);
    grid.appendChild(el);
  });

  document.getElementById('chapter-grid-view').classList.remove('hidden');
  window.scrollTo(0, 0);
}

// ─── Stage 2 → 3 ─────────────────────────────────────────────
function openImageFromGrid(index) {
  document.getElementById('chapter-grid-view').classList.add('hidden');
  document.getElementById('chapter-title').textContent = currentChapter.name;
  document.getElementById('chapter-view').classList.remove('hidden');
  showImage(index);
}

// ─── Stage 3 : Fullscreen viewer ─────────────────────────────
function showImage(index) {
  if (!currentChapter) return;
  const images = currentChapter.images;
  if (!images.length) return;

  currentIndex = (index + images.length) % images.length;
  const img    = images[currentIndex];
  const src    = imgSrc(img.filename);

  document.getElementById('viewer-img').src             = src;
  document.getElementById('viewer-img').alt             = currentChapter.name;
  document.getElementById('viewer-blur-img').src        = src;
  document.getElementById('viewer-caption').textContent = `${currentChapter.name} · FALKOR`;
  document.getElementById('viewer-counter').textContent = `${currentIndex + 1} / ${images.length}`;
}

// Close fullscreen → return to grid
function closeViewer() {
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapter-grid-view').classList.remove('hidden');
}

// Return all the way to carousel
function showChapters() {
  currentChapter = null;
  document.getElementById('chapter-intro').classList.add('hidden');
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapter-grid-view').classList.add('hidden');
  document.getElementById('chapters-carousel-view').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden');

  // Restore the chapter the user was in to centre
  if (carouselCenterSlug) {
    const idx = visibleChapters.findIndex(ch => ch.slug === carouselCenterSlug);
    if (idx !== -1) centerIdx = idx;
  }
  buildCarousel(); // also calls updateSplitWord with no animation
}

// ─── Keyboard ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!document.getElementById('chapter-intro').classList.contains('hidden')) {
    enterChapterImages(); return;
  }
  if (!document.getElementById('chapter-view').classList.contains('hidden')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') showImage(currentIndex + 1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   showImage(currentIndex - 1);
    if (e.key === 'Escape') closeViewer();
  }
});

// ─── Viewer buttons ───────────────────────────────────────────
document.getElementById('next-btn').addEventListener('click', () => showImage(currentIndex + 1));
document.getElementById('prev-btn').addEventListener('click', () => showImage(currentIndex - 1));

// ─── Touch swipe in fullscreen viewer ────────────────────────
let touchStartX = 0;
document.getElementById('image-viewer').addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });
document.getElementById('image-viewer').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) > 50) dx < 0 ? showImage(currentIndex + 1) : showImage(currentIndex - 1);
});

loadChapters();
