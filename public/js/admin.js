let token = localStorage.getItem('admin_token') || '';
let chapters = [];
let allImages = [];
let selectedFiles = [];
let editingImageId = null;
let heroImageId = null;

// ─── AUTH ────────────────────────────────────────────────────
async function checkAuth() {
  if (!token) return showLogin();
  try {
    const res = await fetch('/auth/check', { headers: authHeaders() });
    if (res.ok) showDashboard();
    else showLogin();
  } catch {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadChapters();
  loadImages();
  loadHeroSetting();
}

async function login(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'INVALID CREDENTIALS';
      errEl.classList.remove('hidden');
      return;
    }
    token = data.token;
    localStorage.setItem('admin_token', token);
    showDashboard();
  } catch {
    errEl.textContent = 'CONNECTION ERROR';
    errEl.classList.remove('hidden');
  }
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST', headers: authHeaders() });
  token = '';
  localStorage.removeItem('admin_token');
  showLogin();
}

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

// ─── TABS ─────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.remove('hidden');
  btn.classList.add('active');

  if (name === 'manage') renderImages();
  if (name === 'settings') renderHeroPreview();
}

// ─── CHAPTERS ─────────────────────────────────────────────────
async function loadChapters() {
  const res = await fetch('/admin/api/chapters', { headers: authHeaders() });
  chapters = await res.json();
  populateChapterSelects();
}

function populateChapterSelects() {
  const selects = ['upload-chapter', 'filter-chapter', 'modal-chapter'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id === 'filter-chapter';
    const isModal = id === 'modal-chapter';
    el.innerHTML = isFilter
      ? '<option value="">ALL IMAGES</option>'
      : '<option value="">— UNASSIGNED —</option>';
    chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = ch.name;
      el.appendChild(opt);
    });
  });
}

// ─── FILE SELECTION & UPLOAD ──────────────────────────────────
document.getElementById('file-input').addEventListener('change', e => {
  selectedFiles = Array.from(e.target.files);
  renderUploadPreviews();
});

const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  selectedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  renderUploadPreviews();
});

function renderUploadPreviews() {
  const list = document.getElementById('upload-preview-list');
  const btn = document.getElementById('upload-btn');
  list.innerHTML = '';

  if (!selectedFiles.length) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');

  selectedFiles.forEach(file => {
    const div = document.createElement('div');
    div.className = 'preview-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    const name = document.createElement('p');
    name.className = 'preview-thumb-name';
    name.textContent = file.name;
    div.appendChild(img);
    div.appendChild(name);
    list.appendChild(div);
  });
}

async function uploadFiles() {
  if (!selectedFiles.length) return;

  const chapterId = document.getElementById('upload-chapter').value;
  const progressWrap = document.getElementById('upload-progress');
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const btn = document.getElementById('upload-btn');

  btn.disabled = true;
  progressWrap.classList.remove('hidden');

  const formData = new FormData();
  selectedFiles.forEach(f => formData.append('images', f));
  if (chapterId) formData.append('chapter_id', chapterId);

  try {
    fill.style.width = '30%';
    text.textContent = `UPLOADING ${selectedFiles.length} IMAGE${selectedFiles.length > 1 ? 'S' : ''}…`;

    const res = await fetch('/admin/api/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    fill.style.width = '100%';
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    text.textContent = `${data.uploaded.length} IMAGE${data.uploaded.length > 1 ? 'S' : ''} UPLOADED.`;
    selectedFiles = [];
    document.getElementById('upload-preview-list').innerHTML = '';
    document.getElementById('file-input').value = '';
    btn.classList.add('hidden');
    loadImages();
    setTimeout(() => {
      progressWrap.classList.add('hidden');
      fill.style.width = '0%';
    }, 2000);
  } catch (err) {
    text.textContent = 'UPLOAD FAILED. TRY AGAIN.';
    fill.style.width = '0%';
  }

  btn.disabled = false;
}

// ─── MANAGE IMAGES ────────────────────────────────────────────
async function loadImages() {
  try {
    const res = await fetch('/admin/api/images', { headers: authHeaders() });
    allImages = await res.json();
    renderImages();
  } catch (e) {
    console.error(e);
  }
}

async function loadHeroSetting() {
  try {
    const res = await fetch('/api/hero');
    const hero = await res.json();
    heroImageId = hero?.id || null;
  } catch {}
}

function renderImages() {
  const container = document.getElementById('manage-grid');
  const emptyMsg  = document.getElementById('no-images-msg');
  container.innerHTML = '';

  if (!allImages.length) { emptyMsg.classList.remove('hidden'); return; }
  emptyMsg.classList.add('hidden');

  // Group by chapter
  const groups = {};
  chapters.forEach(ch => { groups[ch.id] = { chapter: ch, images: [] }; });
  groups['null'] = { chapter: { name: 'UNASSIGNED', id: null }, images: [] };

  allImages.forEach(img => {
    const key = img.chapter_id ?? 'null';
    if (!groups[key]) groups[key] = { chapter: { name: img.chapter_name || 'UNASSIGNED', id: img.chapter_id }, images: [] };
    groups[key].images.push(img);
  });

  const orderedKeys = [...chapters.map(c => c.id), 'null'];
  orderedKeys.forEach(key => {
    const group = groups[key];
    if (!group || !group.images.length) return;

    const section = document.createElement('div');
    section.className = 'manage-section';
    section.innerHTML = `
      <div class="manage-section-header">
        <span class="manage-section-title">${group.chapter.name}</span>
        <span class="manage-section-count">${group.images.length} IMAGE${group.images.length !== 1 ? 'S' : ''}</span>
      </div>
      <div class="manage-section-grid" id="section-${key}"></div>
    `;
    container.appendChild(section);

    const grid = section.querySelector('.manage-section-grid');
    group.images.forEach(img => {
      const isHero = img.id === heroImageId;
      const card = document.createElement('div');
      card.className = 'manage-card';
      card.id = `card-${img.id}`;

      const chapterOptions = chapters.map(ch =>
        `<option value="${ch.id}" ${img.chapter_id === ch.id ? 'selected' : ''}>${ch.name}</option>`
      ).join('');

      card.innerHTML = `
        <img src="/${img.filename}" alt="" loading="lazy" />
        <div class="manage-card-overlay">
          <div class="manage-card-top">
            <button class="mc-hero ${isHero ? 'active' : ''}" title="Set as homepage hero" onclick="toggleHero(event,${img.id})">
              ${isHero ? '★ HERO' : '☆ SET HERO'}
            </button>
          </div>
          <div class="manage-card-bottom">
            <select class="mc-chapter-select" onchange="moveImage(${img.id}, this.value)">
              <option value="">UNASSIGNED</option>
              ${chapterOptions}
            </select>
            <button class="mc-delete" onclick="deleteImageInline(event,${img.id})">DELETE</button>
          </div>
        </div>
        <div class="manage-card-name">${img.original_name || img.filename}</div>
      `;
      grid.appendChild(card);
    });
  });
}

async function toggleHero(e, id) {
  e.stopPropagation();
  const isCurrentHero = id === heroImageId;
  await fetch(`/admin/api/images/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_hero: isCurrentHero ? 0 : 1 }),
  });
  heroImageId = isCurrentHero ? null : id;
  renderImages();
  renderHeroPreview();
}

async function moveImage(id, chapterId) {
  await fetch(`/admin/api/images/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapter_id: chapterId || null }),
  });
  await loadImages();
}

async function deleteImageInline(e, id) {
  e.stopPropagation();
  if (!confirm('DELETE THIS IMAGE? THIS CANNOT BE UNDONE.')) return;
  const card = document.getElementById(`card-${id}`);
  if (card) { card.style.opacity = '0.3'; card.style.pointerEvents = 'none'; }
  const res = await fetch(`/admin/api/images/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) {
    allImages = allImages.filter(i => i.id !== id);
    if (heroImageId === id) { heroImageId = null; renderHeroPreview(); }
    renderImages();
  } else {
    if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
  }
}

// ─── SETTINGS ─────────────────────────────────────────────────
function renderHeroPreview() {
  const img = allImages.find(i => i.id === heroImageId);
  const previewImg = document.getElementById('hero-preview-img');
  const noneEl = document.getElementById('hero-none');

  if (img) {
    previewImg.src = `/${img.filename}`;
    previewImg.classList.remove('hidden');
    noneEl.classList.add('hidden');
  } else {
    previewImg.classList.add('hidden');
    noneEl.classList.remove('hidden');
  }
}

async function changePassword(e) {
  e.preventDefault();
  const curr = document.getElementById('curr-pass').value;
  const next = document.getElementById('new-pass').value;
  const msg = document.getElementById('pass-msg');

  const res = await fetch('/admin/api/change-password', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: curr, new_password: next }),
  });

  const data = await res.json();
  msg.textContent = res.ok ? 'PASSWORD UPDATED.' : (data.error?.toUpperCase() || 'ERROR.');
  msg.classList.remove('hidden');
  if (res.ok) {
    document.getElementById('curr-pass').value = '';
    document.getElementById('new-pass').value = '';
  }
}

// ─── INIT ──────────────────────────────────────────────────────
checkAuth();
