let chapters = [];
let currentChapter = null;
let currentIndex = 0;

async function loadChapters() {
  try {
    const res = await fetch('/api/chapters');
    chapters = await res.json();
    renderChapterGrid();
  } catch (e) {
    console.error('Failed to load chapters', e);
  }
}

function renderChapterGrid() {
  const grid = document.getElementById('chapters-grid');
  const notice = document.getElementById('no-images-notice');
  grid.innerHTML = '';

  const hasAnyImage = chapters.some(ch => ch.image_count > 0);

  if (!hasAnyImage) {
    notice.classList.remove('hidden');
    return;
  }

  notice.classList.add('hidden');

  chapters.forEach(ch => {
    const tile = document.createElement('div');
    tile.className = 'chapter-tile';
    tile.onclick = () => openChapter(ch.slug);

    if (ch.lead_image) {
      tile.innerHTML = `
        <img src="/${ch.lead_image.filename}" alt="${ch.name}" loading="lazy" />
        <div class="chapter-tile-overlay"></div>
        <span class="chapter-tile-label">${ch.name}</span>
        <span class="chapter-tile-count">${ch.image_count} ${ch.image_count === 1 ? 'IMAGE' : 'IMAGES'}</span>
      `;
    } else {
      tile.innerHTML = `
        <div class="chapter-empty">${ch.name}</div>
      `;
    }

    grid.appendChild(tile);
  });
}

async function openChapter(slug) {
  try {
    const res = await fetch(`/api/chapters/${slug}`);
    const data = await res.json();
    if (!data.images?.length) return;

    currentChapter = data;
    currentIndex = 0;

    document.getElementById('chapters-view').classList.add('hidden');
    document.getElementById('chapter-view').classList.remove('hidden');
    document.getElementById('chapter-title').textContent = data.name;

    showImage(0);
  } catch (e) {
    console.error('Failed to load chapter', e);
  }
}

function showImage(index) {
  if (!currentChapter) return;
  const images = currentChapter.images;
  if (!images.length) return;

  currentIndex = (index + images.length) % images.length;
  const img = images[currentIndex];

  const viewerImg = document.getElementById('viewer-img');
  viewerImg.src = `/${img.filename}`;
  viewerImg.alt = currentChapter.name;

  document.getElementById('viewer-caption').textContent =
    `${currentChapter.name}, TOKYO · 2026`;

  document.getElementById('viewer-counter').textContent =
    `${currentIndex + 1} / ${images.length}`;
}

function showChapters() {
  currentChapter = null;
  document.getElementById('chapter-view').classList.add('hidden');
  document.getElementById('chapters-view').classList.remove('hidden');
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (!currentChapter) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') showImage(currentIndex + 1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') showImage(currentIndex - 1);
  if (e.key === 'Escape') showChapters();
});

// Button clicks
document.getElementById('next-btn').addEventListener('click', () => showImage(currentIndex + 1));
document.getElementById('prev-btn').addEventListener('click', () => showImage(currentIndex - 1));

// Touch/swipe support
let touchStartX = 0;
document.getElementById('image-viewer').addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});
document.getElementById('image-viewer').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) > 50) {
    if (dx < 0) showImage(currentIndex + 1);
    else showImage(currentIndex - 1);
  }
});

loadChapters();
