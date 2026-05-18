// ─── State ────────────────────────────────────────────────────
let chapters        = [];   // all chapters from API
let visibleChapters = [];   // chapters that have at least one image
let currentChapter  = null; // chapter currently open
let currentIndex    = 0;    // index of image shown in fullscreen viewer
let carouselActiveSlug = null; // slug of last-active carousel slide (for returning)
let swiperInstance  = null;

// ─── Helpers ──────────────────────────────────────────────────
function imgSrc(filename) {
  return filename.startsWith('http') ? filename : '/' + filename;
}

// ─── Load & carousel init ─────────────────────────────────────
async function loadChapters() {
  try {
    const res = await fetch('/api/chapters');
    chapters  = await res.json();
    visibleChapters = chapters.filter(ch => ch.image_count > 0);

    if (!visibleChapters.length) {
      document.getElementById('no-images-notice').classList.remove('hidden');
      return;
    }
    document.getElementById('no-images-notice').classList.add('hidden');
    buildSlides();
    initSwiper();
  } catch (e) {
    console.error('Failed to load chapters', e);
  }
}

function buildSlides() {
  const wrapper = document.getElementById('swiper-slides');
  wrapper.innerHTML = '';

  visibleChapters.forEach(ch => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.dataset.slug = ch.slug;

    const coverImg = ch.hero_image || ch.lead_image;
    const coverSrc = coverImg ? imgSrc(coverImg.filename) : '';

    slide.innerHTML = coverSrc
      ? `<img src="${coverSrc}" alt="${ch.name}" loading="lazy" />
         <div class="slide-overlay"></div>
         <span class="slide-label">${ch.name}</span>`
      : `<div class="slide-empty">${ch.name}</div>`;

    wrapper.appendChild(slide);
  });
}

function initSwiper() {
  // Destroy previous instance if re-initialising
  if (swiperInstance) { swiperInstance.destroy(true, true); swiperInstance = null; }

  swiperInstance = new Swiper('.chapters-swiper', {
    effect:         'coverflow',
    grabCursor:     true,
    centeredSlides: true,
    slidesPerView:  'auto',
    loop:           true,
    loopedSlides:   visibleChapters.length, // clone count prevents blank-slide artefacts

    coverflowEffect: {
      rotate:       42,
      stretch:      0,
      depth:        220,
      modifier:     1,
      slideShadows: false,
    },

    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },

    on: {
      // Clicking the active (centre) slide opens the chapter
      click(sw) {
        const clicked = sw.clickedSlide;
        if (clicked && clicked.classList.contains('swiper-slide-active')) {
          const slug = clicked.dataset.slug;
          if (slug) openChapter(slug);
        }
      },
    },
  });
}

// ─── Stage 1 → 2 : Open chapter ──────────────────────────────
async function openChapter(slug) {
  carouselActiveSlug = slug;
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

// ─── Chapter intro screen (sub-hero) ─────────────────────────
function showChapterIntro(data) {
  document.getElementById('chapter-intro-img').src   = imgSrc(data.hero_image.filename);
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
    const el = document.createElement('img');
    el.src     = imgSrc(img.filename);
    el.alt     = chapter.name;
    el.loading = 'lazy';
    el.onclick = () => openImageFromGrid(index);
    grid.appendChild(el);
  });

  document.getElementById('chapter-grid-view').classList.remove('hidden');
  // Scroll grid to top every time it opens
  window.scrollTo(0, 0);
}

// ─── Stage 2 → 3 : Open fullscreen viewer from grid ──────────
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

  document.getElementById('viewer-img').src      = src;
  document.getElementById('viewer-img').alt      = currentChapter.name;
  document.getElementById('viewer-blur-img').src = src;
  document.getElementById('viewer-caption').textContent  = `${currentChapter.name} · FALKOR`;
  document.getElementById('viewer-counter').textContent  = `${currentIndex + 1} / ${images.length}`;
}

// Close fullscreen viewer → return to image grid
function closeViewer() {
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapter-grid-view').classList.remove('hidden');
}

// Return all the way to the carousel
function showChapters() {
  currentChapter = null;
  document.getElementById('chapter-intro').classList.add('hidden');
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapter-grid-view').classList.add('hidden');
  document.getElementById('chapters-carousel-view').classList.remove('hidden');
  document.getElementById('nav').classList.remove('hidden');

  // Re-centre on the chapter the user came from
  if (carouselActiveSlug && swiperInstance) {
    const realIdx = visibleChapters.findIndex(ch => ch.slug === carouselActiveSlug);
    if (realIdx !== -1) swiperInstance.slideToLoop(realIdx, 300);
  }
}

// ─── Keyboard navigation ──────────────────────────────────────
document.addEventListener('keydown', e => {
  // Intro screen — any key enters images
  if (!document.getElementById('chapter-intro').classList.contains('hidden')) {
    enterChapterImages();
    return;
  }
  // Fullscreen viewer
  if (!document.getElementById('chapter-view').classList.contains('hidden')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') showImage(currentIndex + 1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   showImage(currentIndex - 1);
    if (e.key === 'Escape') closeViewer();
  }
});

// ─── Viewer nav buttons ───────────────────────────────────────
document.getElementById('next-btn').addEventListener('click', () => showImage(currentIndex + 1));
document.getElementById('prev-btn').addEventListener('click', () => showImage(currentIndex - 1));

// ─── Touch swipe in fullscreen viewer ────────────────────────
let touchStartX = 0;
document.getElementById('image-viewer').addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });
document.getElementById('image-viewer').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) > 50) {
    if (dx < 0) showImage(currentIndex + 1);
    else        showImage(currentIndex - 1);
  }
});

loadChapters();
