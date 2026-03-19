/* =====================================================
   app.js — Totoro Photobooth · v4
   Fixes: email reset per session, dual theme support
   ===================================================== */

// ── THEMES ───────────────────────────────────────────
const THEMES = {
  totoro: {
    name:        'totoro',
    label:       '🌿 Totoro',
    bg:          document.createElement('style'),
    stripBg:     '#4e6e50',
    stripColor:  '#ffffff',
    brandName:   '🌿 Totoro Booth',
    primaryColor:'#3d5a40',
    accentColor: '#c1773b',
    bodyBg:      '#f5f0e8',
    cardBg:      '#faf8f3',
    borderColor: '#a8c5a0',
    btnBg:       '#3d5a40',
    btnColor:    '#f5f0e8',
  },
  friends: {
    name:        'friends',
    label:       '☕ Friends',
    stripBg:     '#1a1a2e',
    stripColor:  '#ffffff',
    brandName:   '☕ Central Perk Booth',
    primaryColor:'#c0392b',
    accentColor: '#e67e22',
    bodyBg:      '#fff8f0',
    cardBg:      '#fffaf5',
    borderColor: '#f0c080',
    btnBg:       '#c0392b',
    btnColor:    '#ffffff',
  }
};

let currentTheme = 'totoro';

function applyTheme(name) {
  currentTheme = name;
  const t = THEMES[name];

  // CSS vars on root
  const root = document.documentElement;
  root.style.setProperty('--theme-primary',  t.primaryColor);
  root.style.setProperty('--theme-accent',   t.accentColor);
  root.style.setProperty('--theme-body-bg',  t.bodyBg);
  root.style.setProperty('--theme-card-bg',  t.cardBg);
  root.style.setProperty('--theme-border',   t.borderColor);
  root.style.setProperty('--theme-btn-bg',   t.btnBg);
  root.style.setProperty('--theme-btn-color',t.btnColor);

  // body background
  document.body.style.background = t.bodyBg;

  // Update all primary-colored elements
  document.querySelectorAll('.btn-primary').forEach(el => {
    el.style.background = t.btnBg;
    el.style.color      = t.btnColor;
  });
  document.querySelectorAll('.phase-title, .welcome-title').forEach(el => {
    el.style.color = t.primaryColor;
  });

  // Update theme toggle buttons
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === name);
  });

  // Update welcome hero & text based on theme
  const heroArea = document.getElementById('themeHeroArea');
  if (heroArea) {
    if (name === 'friends') {
      heroArea.innerHTML = `
        <div style="font-size:3.5rem;margin-bottom:.5rem">☕</div>
        <h1 class="welcome-title" style="color:${t.primaryColor};font-family:'Georgia',serif">Central Perk Booth</h1>
        <p class="welcome-sub" style="color:#888">Could this BE any more fun? 📸</p>`;
    } else {
      heroArea.innerHTML = `
        <div class="totoro-hero">${getTotoroSVG()}</div>
        <h1 class="welcome-title" style="color:${t.primaryColor}">Totoro Photobooth</h1>
        <p class="welcome-sub">Capture your magical forest moment ✨</p>`;
    }
  }

  // Update admin link color
  const adminLink = document.querySelector('.admin-link');
  if (adminLink) adminLink.style.background = t.btnBg;

  // Toggle body class for CSS theme overrides
  document.body.classList.toggle('theme-friends', name === 'friends');

  // Store preference
  try { localStorage.setItem('booth_theme', name); } catch(e) {}

  // Update strip config branding
  window.BOOTH_CONFIG = loadConfig();
  window.BOOTH_CONFIG.bgColor   = t.stripBg;
  window.BOOTH_CONFIG.brandName = t.brandName;
  window.BOOTH_CONFIG.brandColor= t.stripColor;

  renderStripMini();
}

function getTotoroSVG() {
  return `<svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:110px;height:auto;filter:drop-shadow(0 4px 12px rgba(40,60,42,.4))">
    <ellipse cx="60" cy="98" rx="45" ry="40" fill="#6b7c6e"/>
    <ellipse cx="60" cy="106" rx="27" ry="27" fill="#c8d5bc"/>
    <circle cx="52" cy="102" r="3.5" fill="#6b7c6e"/><circle cx="60" cy="110" r="3.5" fill="#6b7c6e"/><circle cx="68" cy="102" r="3.5" fill="#6b7c6e"/>
    <ellipse cx="60" cy="52" rx="38" ry="36" fill="#6b7c6e"/>
    <ellipse cx="26" cy="22" rx="10" ry="16" fill="#6b7c6e" transform="rotate(-18 26 22)"/>
    <ellipse cx="94" cy="22" rx="10" ry="16" fill="#6b7c6e" transform="rotate(18 94 22)"/>
    <ellipse cx="47" cy="50" rx="10" ry="12" fill="white"/><ellipse cx="73" cy="50" rx="10" ry="12" fill="white"/>
    <circle cx="49" cy="52" r="6" fill="#1a1a2e"/><circle cx="75" cy="52" r="6" fill="#1a1a2e"/>
    <circle cx="51" cy="49" r="2.5" fill="white"/><circle cx="77" cy="49" r="2.5" fill="white"/>
    <ellipse cx="60" cy="63" rx="4.5" ry="3" fill="#4a5a4d"/>
    <line x1="28" y1="64" x2="52" y2="62" stroke="#4a5a4d" stroke-width="1.5"/>
    <line x1="28" y1="68" x2="52" y2="66" stroke="#4a5a4d" stroke-width="1.5"/>
    <line x1="68" y1="62" x2="92" y2="64" stroke="#4a5a4d" stroke-width="1.5"/>
    <line x1="68" y1="66" x2="92" y2="68" stroke="#4a5a4d" stroke-width="1.5"/>
  </svg>`;
}

// ── STATE ────────────────────────────────────────────
let state = {
  layout:        '2x4',
  filter:        'none',
  facingMode:    'user',
  deviceId:      null,
  stream:        null,
  setupStream:   null,
  retakeStream:  null,
  mainStream:    null,
  photos:        [],
  clips:         [],
  totalPhotos:   4,
  photoIndex:    0,
  sessionActive: false,
  retakeIndex:   null,
  emailSending:  false,   // ← NEW: guard flag
};

// ── BOOT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.layout      = '2x4';
  state.totalPhotos = getTotalPhotos('2x4');

  // Restore saved theme
  const savedTheme = localStorage.getItem('booth_theme') || 'totoro';
  applyTheme(savedTheme);

  await enumerateCameras();
  renderStripMini();
});

// ── PHASE NAVIGATION ─────────────────────────────────
function goPhase(name) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`phase-${name}`);
  if (el) { el.classList.add('active'); el.scrollIntoView({ behavior:'smooth', block:'start' }); }

  if (name === 'camera-setup') initCameraSetup();
  if (name === 'shoot')        initShoot();
  if (name === 'retake')       initRetakeGrid();
  if (name === 'filter')       initFilter();
  if (name === 'finalize')     initFinalize();
  if (name === 'email')        initEmail();
  if (name === 'done')         initDone();

  if (name !== 'camera-setup') stopStream('setup');
  if (name !== 'shoot' && name !== 'retake') stopStream('main');
}

// ── LAYOUT SELECT ─────────────────────────────────────
function selectLayout(btn, layout) {
  document.querySelectorAll('.layout-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.layout      = layout;
  state.totalPhotos = getTotalPhotos(layout);
  state.photos      = [];
  state.clips       = [];
}

// ── CAMERA ENUMERATE ─────────────────────────────────
async function enumerateCameras() {
  try {
    const tmp = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    tmp.getTracks().forEach(t => t.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    const sel = document.getElementById('cameraSelect');
    if (!sel) return;
    sel.innerHTML = '';
    cameras.forEach((cam, i) => {
      const opt = document.createElement('option');
      opt.value = cam.deviceId;
      opt.textContent = cam.label || `Camera ${i + 1}`;
      sel.appendChild(opt);
    });
    if (cameras.length > 0) state.deviceId = cameras[0].deviceId;
  } catch(e) { console.warn('Camera enumerate failed:', e); }
}

function onCameraChange() {
  const sel = document.getElementById('cameraSelect');
  if (sel) state.deviceId = sel.value;
  startCameraOnElement('setupVideo', 'setup');
}

function setFacing(mode, btn) {
  state.facingMode = mode;
  document.querySelectorAll('#btnFront,#btnBack').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  startCameraOnElement('setupVideo', 'setup');
}

// ── CAMERA START ─────────────────────────────────────
async function startCameraOnElement(videoId, streamKey) {
  stopStream(streamKey);
  const constraints = {
    video: { facingMode: state.facingMode, deviceId: state.deviceId ? { exact: state.deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 960 } },
    audio: true
  };
  try {
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    const vid = document.getElementById(videoId);
    if (vid) { vid.srcObject = s; vid.muted = true; }
    state[streamKey + 'Stream'] = s;
    return s;
  } catch(e) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: state.facingMode }, audio: true });
      const vid = document.getElementById(videoId);
      if (vid) { vid.srcObject = s; vid.muted = true; }
      state[streamKey + 'Stream'] = s;
      return s;
    } catch(e2) { console.warn('Camera start failed:', e2); return null; }
  }
}

function stopStream(key) {
  const s = state[key + 'Stream'];
  if (s) { s.getTracks().forEach(t => t.stop()); state[key + 'Stream'] = null; }
}

// ── CAMERA SETUP ──────────────────────────────────────
async function initCameraSetup() {
  await enumerateCameras();
  const sel = document.getElementById('cameraSelect');
  if (sel && state.deviceId) sel.value = state.deviceId;
  startCameraOnElement('setupVideo', 'setup');
}

// ── SHOOT ──────────────────────────────────────────────
async function initShoot() {
  const shootVid = document.getElementById('shootVideo');
  let s = state.setupStream || state.mainStream;
  if (!s) s = await startCameraOnElement('shootVideo', 'main');
  else { shootVid.srcObject = s; state.mainStream = s; state.setupStream = null; }
  buildSeqDots();
  renderStripMini();
  setEl('retakeBtn',    'display', 'none');
  setEl('doneShootBtn', 'display', 'none');
  document.getElementById('shootBtn').style.display = '';
  document.getElementById('shootStatus').textContent = 'Press Start when ready!';
}

function buildSeqDots() {
  const container = document.getElementById('shootDots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < state.totalPhotos; i++) {
    const d = document.createElement('div');
    d.className = 'seq-dot' + (state.photos[i] ? ' done' : '');
    d.id = `sdot-${i}`;
    container.appendChild(d);
  }
  updateSeqLabel();
}

function updateSeqDots(doneCount, activeIndex) {
  for (let i = 0; i < state.totalPhotos; i++) {
    const d = document.getElementById(`sdot-${i}`);
    if (!d) continue;
    d.className = 'seq-dot' + (i < doneCount ? ' done' : (i === activeIndex ? ' active' : ''));
  }
  updateSeqLabel();
}

function updateSeqLabel() {
  const lbl = document.getElementById('shootSeqLbl');
  if (lbl) lbl.textContent = `${state.photos.filter(Boolean).length} / ${state.totalPhotos}`;
}

async function startShootSession() {
  if (state.sessionActive) return;
  state.sessionActive = true;
  state.photos    = Array(state.totalPhotos).fill(null);
  state.clips     = [];
  state.photoIndex = 0;
  document.getElementById('shootBtn').style.display = 'none';
  setEl('retakeBtn',    'display', 'none');
  setEl('doneShootBtn', 'display', 'none');
  buildSeqDots();
  await shootNext();
}

async function shootNext() {
  if (state.photoIndex >= state.totalPhotos) { finishShoot(); return; }
  updateSeqDots(state.photoIndex, state.photoIndex);
  setStatus(`Photo ${state.photoIndex + 1} of ${state.totalPhotos} — smile! 😄`);
  await countdown3AndCapture();
}

async function countdown3AndCapture() {
  const bubble = document.getElementById('shootCountdown');
  const clipChunks = [];
  let recorder = null;
  const s = state.mainStream;
  if (s) {
    try {
      const mime = getBestMime();
      recorder = new MediaRecorder(s, mime ? { mimeType: mime } : {});
      recorder.ondataavailable = e => { if (e.data?.size > 0) clipChunks.push(e.data); };
      recorder.start(100);
    } catch(e) { recorder = null; }
  }
  for (let i = 3; i >= 1; i--) {
    bubble.textContent = i;
    bubble.classList.add('visible');
    await sleep(1000);
  }
  bubble.textContent = '📸';
  await sleep(300);
  bubble.classList.remove('visible');
  bubble.textContent = '';

  if (recorder && recorder.state !== 'inactive') {
    recorder.onstop = () => {
      const mime = recorder.mimeType || 'video/webm';
      const blob = new Blob(clipChunks, { type: mime });
      state.clips[state.photoIndex] = { blob, objectUrl: URL.createObjectURL(blob) };
    };
    recorder.stop();
  }

  captureFromVideo('shootVideo', 'shootFlash', 'shootCanvas');
  await sleep(500);
  renderStripMini();
  state.photoIndex++;
  await sleep(700);
  await shootNext();
}

function captureFromVideo(videoId, flashId, canvasId) {
  const vid   = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId) || document.createElement('canvas');
  const flash  = document.getElementById(flashId);
  const vw = vid?.videoWidth  || 640;
  const vh = vid?.videoHeight || 480;
  canvas.width = vw; canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (state.facingMode === 'user') { ctx.save(); ctx.translate(vw, 0); ctx.scale(-1,1); }
  ctx.drawImage(vid, 0, 0, vw, vh);
  if (state.facingMode === 'user') ctx.restore();
  if (flash) { flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash'); }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  state.photos[state.photoIndex] = dataUrl;
  return dataUrl;
}

function finishShoot() {
  state.sessionActive = false;
  setStatus('🎉 All done! Retake any shot or continue.');
  updateSeqDots(state.totalPhotos, -1);
  document.getElementById('shootBtn').style.display = 'none';
  setEl('retakeBtn',    'display', '');
  setEl('doneShootBtn', 'display', '');
  renderStripMini();
  saveSession({ date: new Date().toISOString(), layout: state.layout, photos: state.photos.length });
}

async function renderStripMini() {
  const wrap = document.getElementById('stripMiniWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  await renderStrip(state.photos, state.layout, 'none', getThemedConfig(), canvas);
  canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.style.borderRadius = '8px';
}

// ── RETAKE ────────────────────────────────────────────
function initRetakeGrid() {
  const grid = document.getElementById('retakeGrid');
  if (!grid) return;
  grid.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const cell = document.createElement('div');
    cell.className = 'retake-cell';
    if (photo) {
      const img = document.createElement('img');
      img.src = photo; img.alt = `Photo ${i+1}`;
      cell.appendChild(img);
    } else {
      cell.textContent = `Photo ${i+1}`;
      cell.style.background = '#2a3f2c'; cell.style.color = '#a8c5a0';
    }
    const badge = document.createElement('div');
    badge.className = 'retake-cell-badge'; badge.textContent = `🔁 Retake ${i+1}`;
    cell.appendChild(badge);
    cell.onclick = () => openRetakeModal(i);
    grid.appendChild(cell);
  });
}

function openRetakeModal(index) {
  state.retakeIndex = index;
  document.getElementById('retakePhotoNum').textContent = index + 1;
  document.getElementById('retakeModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  startCameraOnElement('retakeVideo', 'retake');
}

function closeRetakeModal() {
  document.getElementById('retakeModal').classList.remove('open');
  document.body.style.overflow = '';
  stopStream('retake');
  state.retakeIndex = null;
}

function triggerRetakeCountdown() {
  const btn = document.querySelector('.modal-actions .btn-primary');
  if (btn) btn.disabled = true;
  retakeCountdown3();
}

async function retakeCountdown3() {
  const bubble = document.getElementById('retakeCountdown');
  for (let i = 3; i >= 1; i--) {
    bubble.textContent = i; bubble.classList.add('visible'); await sleep(1000);
  }
  bubble.textContent = '📸'; await sleep(300);
  bubble.classList.remove('visible'); bubble.textContent = '';
  const vid = document.getElementById('retakeVideo');
  const flash = document.getElementById('retakeFlash');
  const canvas = document.createElement('canvas');
  const vw = vid?.videoWidth || 640; const vh = vid?.videoHeight || 480;
  canvas.width = vw; canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (state.facingMode === 'user') { ctx.save(); ctx.translate(vw,0); ctx.scale(-1,1); }
  ctx.drawImage(vid, 0, 0, vw, vh);
  if (state.facingMode === 'user') ctx.restore();
  flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash');
  state.photos[state.retakeIndex] = canvas.toDataURL('image/jpeg', 0.92);
  await sleep(600);
  closeRetakeModal();
  initRetakeGrid();
  renderStripMini();
}

// ── FILTER ────────────────────────────────────────────
let pendingFilter = 'none';

async function initFilter() {
  pendingFilter = state.filter;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.toggle('active', b.dataset.filter === pendingFilter));
  await drawFilterPreview(pendingFilter);
}

async function previewFilter(name, btn) {
  pendingFilter = name;
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  await drawFilterPreview(name);
}

async function drawFilterPreview(filter) {
  const canvas = document.getElementById('filterCanvas');
  if (!canvas) return;
  const cfg = Object.assign({}, window.BOOTH_CONFIG || loadConfig());
  const t = THEMES[currentTheme];
  cfg.bgColor = t.stripBg; cfg.brandName = t.brandName; cfg.brandColor = t.stripColor;
  await renderStrip(state.photos, state.layout, filter, cfg, canvas);
  canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.style.borderRadius = '8px';
}

function applyFilterAndNext() { state.filter = pendingFilter; goPhase('finalize'); }

// ── FINALIZE ──────────────────────────────────────────
async function initFinalize() {
  const container = document.getElementById('finalizeStrips');
  if (!container) return;
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'finalCanvas';
  container.appendChild(canvas);
  const cfg = getThemedConfig();
  await renderStrip(state.photos, state.layout, state.filter, cfg, canvas);
  canvas.style.cssText = 'width:100%;max-width:480px;height:auto;border-radius:10px;box-shadow:0 8px 32px rgba(20,35,22,.4);display:block;margin:0 auto';
}

function getThemedConfig() {
  // Load the correct per-theme admin config from localStorage
  const themeKey = currentTheme === 'friends' ? 'friends_config' : 'totoro_config';
  let cfg;
  try {
    const raw = localStorage.getItem(themeKey);
    cfg = raw ? Object.assign({}, loadConfig(), JSON.parse(raw)) : Object.assign({}, loadConfig());
  } catch(e) {
    cfg = Object.assign({}, loadConfig());
  }

  // Apply theme identity defaults (only if not overridden in admin)
  const t = THEMES[currentTheme];
  if (!cfg.bgColor || cfg.bgColor === '#4e6e50') cfg.bgColor = t.stripBg;
  if (!cfg.brandName || cfg.brandName === '🌿 Totoro Booth') cfg.brandName = t.brandName;
  if (!cfg.brandColor) cfg.brandColor = t.stripColor;

  return cfg;
}

async function downloadFinalStrip() {
  const canvas = document.getElementById('finalCanvas');
  if (!canvas) return;
  await renderStrip(state.photos, state.layout, state.filter, getThemedConfig(), canvas);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `booth-strip-${Date.now()}.png`;
  a.click();
}

// ── EMAIL ─────────────────────────────────────────────
async function initEmail() {
  // ── ALWAYS fully reset email UI on every visit ──────
  resetEmailUI();

  window.BOOTH_CONFIG = loadConfig();
  const cfg = window.BOOTH_CONFIG;

  // Strip thumbnail
  const thumbRow = document.getElementById('emailThumbRow');
  if (thumbRow) {
    thumbRow.innerHTML = '';
    const miniCanvas = document.createElement('canvas');
    thumbRow.appendChild(miniCanvas);
    await renderStrip(state.photos, state.layout, state.filter, getThemedConfig(), miniCanvas);
    miniCanvas.style.cssText = 'width:140px;height:auto;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
  }

  // Quick config panel — only show if credentials are truly missing
  const themeCreds = getEmailConfigForTheme(currentTheme);
  const configured = isEmailConfigured(currentTheme);
  const qc = document.getElementById('quickConfigPanel');
  const qcTitle = document.getElementById('quickConfigTitle');
  if (qcTitle) qcTitle.textContent = currentTheme === 'friends'
    ? '⚙️ Friends Theme — EmailJS Setup'
    : '⚙️ Totoro Theme — EmailJS Setup';
  if (qc) {
    // Hide panel if hardcoded credentials exist
    qc.style.display = configured ? 'none' : 'block';
    if (!configured) {
      setInputVal('qcServiceId',  themeCreds.ejsServiceId  || '');
      setInputVal('qcTemplateId', themeCreds.ejsTemplateId || '');
      setInputVal('qcPublicKey',  themeCreds.ejsPublicKey  || '');
    }
  }
}

function resetEmailUI() {
  state.emailSending = false;
  const sendBtn = document.getElementById('sendEmailBtn');
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send ✉️'; }
  const emailInput = document.getElementById('emailInput');
  if (emailInput) emailInput.value = '';
  const statusBox = document.getElementById('emailStatusBox');
  if (statusBox) { statusBox.style.display = 'none'; statusBox.textContent = ''; statusBox.className = 'email-status-box'; }
}

function saveQuickConfig() {
  const svc = document.getElementById('qcServiceId')?.value.trim();
  const tpl = document.getElementById('qcTemplateId')?.value.trim();
  const key = document.getElementById('qcPublicKey')?.value.trim();
  if (!svc || !tpl || !key) { showEmailStatus('⚠️ Please fill in all three fields.', 'warn'); return; }
  const cfg = window.BOOTH_CONFIG;
  cfg.ejsServiceId = svc; cfg.ejsTemplateId = tpl; cfg.ejsPublicKey = key;
  saveConfig(cfg); window.BOOTH_CONFIG = cfg;
  document.getElementById('quickConfigPanel').style.display = 'none';
  showEmailStatus('✅ Saved! You can now send the email.', 'success');
}

function setInputVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

async function sendEmail() {
  // Guard: prevent double-send
  if (state.emailSending) return;

  window.BOOTH_CONFIG = loadConfig();
  const cfg = window.BOOTH_CONFIG;

  // ── Use per-theme email credentials ──────────────────
  const themeCreds = getEmailConfigForTheme(currentTheme);
  cfg.ejsServiceId  = themeCreds.ejsServiceId  || cfg.ejsServiceId;
  cfg.ejsTemplateId = themeCreds.ejsTemplateId || cfg.ejsTemplateId;
  cfg.ejsPublicKey  = themeCreds.ejsPublicKey  || cfg.ejsPublicKey;
  cfg.ejsFromName   = themeCreds.ejsFromName   || cfg.ejsFromName;
  cfg.ejsSubject    = themeCreds.ejsSubject    || cfg.ejsSubject;

  const emailAddr = document.getElementById('emailInput').value.trim();
  if (!emailAddr || !isValidEmail(emailAddr)) {
    showEmailStatus('⚠️ Please enter a valid email address.', 'warn'); return;
  }
  if (!cfg.ejsServiceId || !cfg.ejsTemplateId || !cfg.ejsPublicKey) {
    showEmailStatus('⚠️ EmailJS not configured. Fill in the fields above.', 'warn');
    const qc = document.getElementById('quickConfigPanel');
    if (qc) qc.style.display = 'block';
    return;
  }

  // Lock the send button
  state.emailSending = true;
  const sendBtn = document.getElementById('sendEmailBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  showEmailStatus('📤 Sending your memories…', 'info');

  // Compress strip for EmailJS 50KB limit
  const canvas = document.createElement('canvas');
  await renderStrip(state.photos, state.layout, state.filter, getThemedConfig(), canvas);
  const smallCanvas = document.createElement('canvas');
  const maxW   = 400;
  const scale  = maxW / canvas.width;
  smallCanvas.width  = maxW;
  smallCanvas.height = Math.round(canvas.height * scale);
  smallCanvas.getContext('2d').drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
  const stripBase64 = smallCanvas.toDataURL('image/jpeg', 0.45);

  await loadEmailJS();

  try {
    // Re-init emailjs every send to avoid stale state between sessions
    emailjs.init({ publicKey: cfg.ejsPublicKey, blockHeadless: false });

    const result = await emailjs.send(cfg.ejsServiceId, cfg.ejsTemplateId, {
      to_email:    emailAddr,
      from_name:   cfg.ejsFromName || 'Totoro Photobooth',
      subject:     cfg.ejsSubject  || 'Your Booth Memories 🌿',
      message:     `Hi! Here are your photobooth memories from ${formatDateShort()}. Enjoy! 🌿`,
      strip_image: stripBase64,
    });

    if (result.status === 200) {
      showEmailStatus('✅ Sent! Check your inbox 🌿', 'success');
      state.emailSending = false;
      setTimeout(() => goPhase('done'), 1800);
    } else {
      showEmailStatus('❌ Send failed. Check your EmailJS credentials.', 'error');
      state.emailSending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = 'Retry ✉️';
    }
  } catch(e) {
    const msg = e?.text || e?.message || JSON.stringify(e) || 'Unknown error';
    showEmailStatus(`❌ Error: ${msg}`, 'error');
    state.emailSending = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Retry ✉️';
  }
}

function showEmailStatus(msg, type) {
  const box = document.getElementById('emailStatusBox');
  if (!box) return;
  box.style.display = 'block';
  box.className = `email-status-box status-${type}`;
  box.textContent = msg;
}

function loadEmailJS() {
  return new Promise(res => {
    if (window.emailjs) { res(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = res; s.onerror = res;
    document.head.appendChild(s);
  });
}

// ── DONE ──────────────────────────────────────────────
async function initDone() {
  const cont = document.getElementById('doneStrips');
  if (!cont) return;
  cont.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'finalCanvas';
  cont.appendChild(canvas);
  await renderStrip(state.photos, state.layout, state.filter, getThemedConfig(), canvas);
  canvas.style.cssText = 'width:100%;max-width:360px;height:auto;border-radius:10px;margin:1rem auto;display:block;box-shadow:0 8px 28px rgba(0,0,0,.35)';
}

// ── RESTART ───────────────────────────────────────────
function restartBooth() {
  state.photos        = [];
  state.clips         = [];
  state.filter        = 'none';
  state.photoIndex    = 0;
  state.sessionActive = false;
  state.emailSending  = false;
  stopStream('main');
  stopStream('setup');
  stopStream('retake');
  resetEmailUI();
  goPhase('welcome');
}

// ── UTILS ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function getBestMime() {
  const types = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'];
  for (const t of types) { if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t; }
  return '';
}
function setEl(id, prop, val) { const el = document.getElementById(id); if (el) el.style[prop] = val; }
function setStatus(msg) { const el = document.getElementById('shootStatus'); if (el) el.textContent = msg; }
function formatDateShort() { return new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); }
function retakePhoto() { goPhase('retake'); }
function skipToFilter() { goPhase('filter'); }
