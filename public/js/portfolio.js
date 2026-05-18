let chapters     = [];
let currentChapter = null;
let currentIndex   = 0;

async function loadChapters() {
  try {
    const res = await fetch('/api/chapters');
    chapters  = await res.json();
    renderChapterGrid();
  } catch (e) {
    console.error('Failed to load chapters', e);
  }
}

// ── Chapter grid with smart portrait / landscape grouping ─────────────────────
// Every group of 3 chapters → 3-column portrait row
// Leftover 1 or 2 chapters  → landscape stacked row
// Pattern repeats infinitely as chapters are added
function renderChapterGrid() {
  const grid   = document.getElementById('chapters-grid');
  const notice = document.getElementById('no-images-notice');
  grid.innerHTML = '';

  const visible = chapters.filter(ch => ch.image_count > 0);

  if (!visible.length) { notice.classList.remove('hidden'); return; }
  notice.classList.add('hidden');

  let i = 0;
  while (i < visible.length) {
    const remaining = visible.length - i;

    if (remaining >= 3) {
      // Portrait trio
      const row = document.createElement('div');
      row.className = 'chapter-row-portrait';
      for (let j = 0; j < 3; j++) {
        row.appendChild(createTile(visible[i + j]));
      }
      grid.appendChild(row);
      i += 3;
    } else {
      // Landscape (1 or 2 remaining)
      const row = document.createElement('div');
      row.className = 'chapter-row-landscape';
      for (let j = 0; j < remaining; j++) {
        row.appendChild(createTile(visible[i + j]));
      }
      grid.appendChild(row);
      i += remaining;
    }
  }
}

function createTile(ch) {
  const tile     = document.createElement('div');
  tile.className = 'chapter-tile';
  tile.onclick   = () => openChapter(ch.slug);

  // Use designated cover, fall back to lead image
  const coverImg = ch.hero_image || ch.lead_image;

  if (coverImg) {
    const src = coverImg.filename.startsWith('http') ? coverImg.filename : '/' + coverImg.filename;
    tile.innerHTML = `
      <img src="${src}" alt="${ch.name}" loading="lazy" />
      <div class="chapter-tile-overlay"></div>
      <span class="chapter-tile-label">${ch.name}</span>
      <span class="chapter-tile-count">${ch.image_count} ${ch.image_count === 1 ? 'IMAGE' : 'IMAGES'}</span>
    `;
  } else {
    tile.innerHTML = `<div class="chapter-empty">${ch.name}</div>`;
  }

  return tile;
}

// ── Open chapter ──────────────────────────────────────────────────────────────
async function openChapter(slug) {
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

// ── Chapter intro screen ──────────────────────────────────────────────────────
function showChapterIntro(data) {
  const src = data.hero_image.filename.startsWith('http')
    ? data.hero_image.filename
    : '/' + data.hero_image.filename;

  document.getElementById('chapter-intro-img').src = src;
  document.getElementById('chapter-intro-title').textContent = data.name;
  document.getElementById('chapters-view').classList.add('hidden');
  document.getElementById('chapter-intro').classList.remove('hidden');
}

function enterChapterImages() {
  document.getElementById('chapter-intro').classList.add('hidden');
  document.getElementById('chapters-view').classList.add('hidden');
  document.getElementById('chapter-view').classList.remove('hidden');
  document.getElementById('chapter-title').textContent = currentChapter.name;
  showImage(0);
}

document.getElementById('chapter-intro-enter').addEventListener('click', enterChapterImages);

// ── Image viewer ──────────────────────────────────────────────────────────────
function showImage(index) {
  if (!currentChapter) return;
  const images = currentChapter.images;
  if (!images.length) return;

  currentIndex = (index + images.length) % images.length;
  const img    = images[currentIndex];
  const src    = img.filename.startsWith('http') ? img.filename : '/' + img.filename;

  // Sharp foreground image
  const viewerImg = document.getElementById('viewer-img');
  viewerImg.src   = src;
  viewerImg.alt   = currentChapter.name;

  // Blurred background — same image, styled to bleed colour
  document.getElementById('viewer-blur-img').src = src;

  document.getElementById('viewer-caption').textContent = `${currentChapter.name} · FALKOR`;
  document.getElementById('viewer-counter').textContent = `${currentIndex + 1} / ${images.length}`;
}

function showChapters() {
  currentChapter = null;
  document.getElementById('chapter-intro').classList.add('hidden');
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapters-view').classList.remove('hidden');
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const intro = document.getElementById('chapter-intro');
  if (!intro.classList.contains('hidden')) { enterChapterImages(); return; }
  if (!currentChapter) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') showImage(currentIndex + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   showImage(currentIndex - 1);
  if (e.key === 'Escape') showChapters();
});

// ── Buttons ───────────────────────────────────────────────────────────────────
document.getElementById('next-btn').addEventListener('click', () => showImage(currentIndex + 1));
document.getElementById('prev-btn').addEventListener('click', () => showImage(currentIndex - 1));

// ── Swipe ─────────────────────────────────────────────────────────────────────
let touchStartX = 0;
document.getElementById('image-viewer').addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});
document.getElementById('image-viewer').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) > 50) {
    if (dx < 0) showImage(currentIndex + 1);
    else        showImage(currentIndex - 1);
  }
});

loadChapters();
