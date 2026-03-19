/* =====================================================
   app.js — Main photobooth flow logic
   ===================================================== */

// ── STATE ────────────────────────────────────────────
let state = {
  layout:        '2x4',
  filter:        'none',
  facingMode:    'user',
  deviceId:      null,
  stream:        null,
  setupStream:   null,
  retakeStream:  null,

  photos:        [],      // array of dataUrl strings
  clips:         [],      // array of {blob, objectUrl}

  totalPhotos:   4,
  photoIndex:    0,
  sessionActive: false,
  retakeIndex:   null,
};

// ── BOOT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.layout      = '2x4';
  state.totalPhotos = getTotalPhotos('2x4');
  await enumerateCameras();
  renderStripMini();
});

// ── PHASE NAVIGATION ─────────────────────────────────
function goPhase(name) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`phase-${name}`);
  if (el) { el.classList.add('active'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  // Phase-specific init
  if (name === 'camera-setup') initCameraSetup();
  if (name === 'shoot')        initShoot();
  if (name === 'retake')       initRetakeGrid();
  if (name === 'filter')       initFilter();
  if (name === 'finalize')     initFinalize();
  if (name === 'email')        initEmail();
  if (name === 'done')         initDone();

  // Stop setup stream when leaving setup
  if (name !== 'camera-setup') stopStream('setup');
  // Stop shoot stream when leaving shoot (unless retake modal)
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
    // Request permission first so labels are visible
    const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
  } catch(e) {
    console.warn('Camera enumerate failed:', e);
  }
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

// ── GENERIC CAMERA START ─────────────────────────────
async function startCameraOnElement(videoId, streamKey) {
  stopStream(streamKey);
  const constraints = {
    video: {
      facingMode:  state.facingMode,
      deviceId:    state.deviceId ? { exact: state.deviceId } : undefined,
      width:  { ideal: 1280 },
      height: { ideal: 960 }
    },
    audio: true
  };
  try {
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    const vid = document.getElementById(videoId);
    if (vid) { vid.srcObject = s; vid.muted = true; }
    state[streamKey + 'Stream'] = s;
    return s;
  } catch(e) {
    // Try without exact deviceId
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: state.facingMode }, audio: true });
      const vid = document.getElementById(videoId);
      if (vid) { vid.srcObject = s; vid.muted = true; }
      state[streamKey + 'Stream'] = s;
      return s;
    } catch(e2) {
      console.warn('Camera start failed:', e2);
      return null;
    }
  }
}

function stopStream(key) {
  const s = state[key + 'Stream'];
  if (s) { s.getTracks().forEach(t => t.stop()); state[key + 'Stream'] = null; }
}

// ── PHASE: CAMERA SETUP ──────────────────────────────
async function initCameraSetup() {
  await enumerateCameras();
  // Sync select to current deviceId
  const sel = document.getElementById('cameraSelect');
  if (sel && state.deviceId) sel.value = state.deviceId;
  startCameraOnElement('setupVideo', 'setup');
}

// ── PHASE: SHOOT ─────────────────────────────────────
async function initShoot() {
  // Reuse setup stream if available, else start new
  const shootVid = document.getElementById('shootVideo');
  let s = state.setupStream || state.mainStream;
  if (!s) s = await startCameraOnElement('shootVideo', 'main');
  else { shootVid.srcObject = s; state.mainStream = s; state.setupStream = null; }

  buildSeqDots();
  renderStripMini();

  // Reset UI buttons
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
  state.photos = Array(state.totalPhotos).fill(null);
  state.clips  = [];
  state.photoIndex = 0;
  document.getElementById('shootBtn').style.display = 'none';
  setEl('retakeBtn',    'display', 'none');
  setEl('doneShootBtn', 'display', 'none');
  buildSeqDots();
  await shootNext();
}

async function shootNext() {
  if (state.photoIndex >= state.totalPhotos) {
    finishShoot();
    return;
  }
  updateSeqDots(state.photoIndex, state.photoIndex);
  setStatus(`Photo ${state.photoIndex + 1} of ${state.totalPhotos} — smile! 😄`);
  await countdown3AndCapture();
}

async function countdown3AndCapture() {
  const bubble = document.getElementById('shootCountdown');

  // Start 3-second video clip recording simultaneously
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

  // Stop clip
  if (recorder && recorder.state !== 'inactive') {
    recorder.onstop = () => {
      const mime = recorder.mimeType || 'video/webm';
      const blob = new Blob(clipChunks, { type: mime });
      state.clips[state.photoIndex] = { blob, objectUrl: URL.createObjectURL(blob) };
    };
    recorder.stop();
  }

  // Flash + capture
  captureFromVideo('shootVideo', 'shootFlash', 'shootCanvas');

  await sleep(500);
  renderStripMini();

  // Brief pause then next
  state.photoIndex++;
  await sleep(700);
  await shootNext();
}

function captureFromVideo(videoId, flashId, canvasId) {
  const vid    = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId) || document.createElement('canvas');
  const flash  = document.getElementById(flashId);

  const vw = vid?.videoWidth  || 640;
  const vh = vid?.videoHeight || 480;
  canvas.width  = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');

  if (state.facingMode === 'user') {
    ctx.save(); ctx.translate(vw, 0); ctx.scale(-1, 1);
  }
  ctx.drawImage(vid, 0, 0, vw, vh);
  if (state.facingMode === 'user') ctx.restore();

  if (flash) {
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');
  }

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

  // Save session record
  saveSession({
    date:   new Date().toISOString(),
    layout: state.layout,
    photos: state.photos.length,
  });
}

// ── STRIP MINI (live preview during shoot) ───────────
async function renderStripMini() {
  const wrap = document.getElementById('stripMiniWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  await renderStrip(state.photos, state.layout, 'none', window.BOOTH_CONFIG, canvas);
  canvas.style.width  = '100%';
  canvas.style.height = 'auto';
  canvas.style.borderRadius = '8px';
}

// ── PHASE: RETAKE ─────────────────────────────────────
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
      cell.style.background = '#2a3f2c';
      cell.style.color = '#a8c5a0';
    }
    const badge = document.createElement('div');
    badge.className = 'retake-cell-badge';
    badge.textContent = `🔁 Retake ${i+1}`;
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
    bubble.textContent = i;
    bubble.classList.add('visible');
    await sleep(1000);
  }
  bubble.textContent = '📸';
  await sleep(300);
  bubble.classList.remove('visible');
  bubble.textContent = '';

  // Capture
  const vid   = document.getElementById('retakeVideo');
  const flash = document.getElementById('retakeFlash');
  const canvas = document.createElement('canvas');
  const vw = vid?.videoWidth  || 640;
  const vh = vid?.videoHeight || 480;
  canvas.width = vw; canvas.height = vh;
  const ctx = canvas.getContext('2d');
  if (state.facingMode === 'user') { ctx.save(); ctx.translate(vw, 0); ctx.scale(-1,1); }
  ctx.drawImage(vid, 0, 0, vw, vh);
  if (state.facingMode === 'user') ctx.restore();

  flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash');

  state.photos[state.retakeIndex] = canvas.toDataURL('image/jpeg', 0.92);
  await sleep(600);
  closeRetakeModal();
  initRetakeGrid();
  renderStripMini();
}

// ── PHASE: FILTER ─────────────────────────────────────
let pendingFilter = 'none';

async function initFilter() {
  pendingFilter = state.filter;
  document.querySelectorAll('.filter-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === pendingFilter);
  });
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
  await renderStrip(state.photos, state.layout, filter, window.BOOTH_CONFIG, canvas);
  canvas.style.width  = '100%';
  canvas.style.height = 'auto';
  canvas.style.borderRadius = '8px';
}

function applyFilterAndNext() {
  state.filter = pendingFilter;
  goPhase('finalize');
}

// ── PHASE: FINALIZE ───────────────────────────────────
async function initFinalize() {
  const container = document.getElementById('finalizeStrips');
  if (!container) return;
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'finalCanvas';
  container.appendChild(canvas);
  await renderStrip(state.photos, state.layout, state.filter, window.BOOTH_CONFIG, canvas);
  canvas.style.width  = '100%';
  canvas.style.maxWidth = '480px';
  canvas.style.height = 'auto';
  canvas.style.borderRadius = '10px';
  canvas.style.boxShadow = '0 8px 32px rgba(20,35,22,0.4)';
  canvas.style.display = 'block';
  canvas.style.margin  = '0 auto';
}

async function downloadFinalStrip() {
  const canvas = document.getElementById('finalCanvas');
  if (!canvas) return;
  // Ensure it's rendered
  await renderStrip(state.photos, state.layout, state.filter, window.BOOTH_CONFIG, canvas);
  const a = document.createElement('a');
  a.href     = canvas.toDataURL('image/png');
  a.download = `totoro-strip-${Date.now()}.png`;
  a.click();
}

// ── PHASE: EMAIL ──────────────────────────────────────
async function initEmail() {
  // Reload config fresh each time (picks up hardcoded values)
  window.BOOTH_CONFIG = loadConfig();
  const cfg = window.BOOTH_CONFIG;

  // ── RESET email UI state every time we enter this phase ──
  const sendBtn = document.getElementById('sendEmailBtn');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send ✉️';
  }
  const emailInput = document.getElementById('emailInput');
  if (emailInput) emailInput.value = '';
  const statusBox = document.getElementById('emailStatusBox');
  if (statusBox) { statusBox.style.display = 'none'; statusBox.textContent = ''; }

  // Thumb
  const thumbRow = document.getElementById('emailThumbRow');
  if (thumbRow) {
    thumbRow.innerHTML = '';
    const miniCanvas = document.createElement('canvas');
    thumbRow.appendChild(miniCanvas);
    await renderStrip(state.photos, state.layout, state.filter, cfg, miniCanvas);
    miniCanvas.style.width  = '140px';
    miniCanvas.style.height = 'auto';
    miniCanvas.style.borderRadius = '6px';
    miniCanvas.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
  }

  // Show quick-config panel if EmailJS not set up
  const qc = document.getElementById('quickConfigPanel');
  if (qc) {
    const isConfigured = cfg.ejsServiceId && cfg.ejsTemplateId && cfg.ejsPublicKey;
    qc.style.display = isConfigured ? 'none' : 'block';
    if (!isConfigured) {
      setInputVal('qcServiceId',  cfg.ejsServiceId  || '');
      setInputVal('qcTemplateId', cfg.ejsTemplateId || '');
      setInputVal('qcPublicKey',  cfg.ejsPublicKey  || '');
    }
  }
}

function saveQuickConfig() {
  const svc = document.getElementById('qcServiceId')?.value.trim();
  const tpl = document.getElementById('qcTemplateId')?.value.trim();
  const key = document.getElementById('qcPublicKey')?.value.trim();
  if (!svc || !tpl || !key) {
    showEmailStatus('⚠️ Please fill in all three EmailJS fields.', 'warn');
    return;
  }
  const cfg = window.BOOTH_CONFIG;
  cfg.ejsServiceId  = svc;
  cfg.ejsTemplateId = tpl;
  cfg.ejsPublicKey  = key;
  saveConfig(cfg);
  window.BOOTH_CONFIG = cfg;
  document.getElementById('quickConfigPanel').style.display = 'none';
  showEmailStatus('✅ EmailJS saved! You can now send the email.', 'success');
}

function setInputVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

async function sendEmail() {
  // Reload config to catch any just-saved quick config
  window.BOOTH_CONFIG = loadConfig();
  const cfg = window.BOOTH_CONFIG;

  const emailAddr = document.getElementById('emailInput').value.trim();
  if (!emailAddr || !isValidEmail(emailAddr)) {
    showEmailStatus('⚠️ Please enter a valid email address.', 'warn');
    return;
  }

  if (!cfg.ejsServiceId || !cfg.ejsTemplateId || !cfg.ejsPublicKey) {
    showEmailStatus('⚠️ EmailJS not configured. Fill in the fields above first.', 'warn');
    const qc = document.getElementById('quickConfigPanel');
    if (qc) qc.style.display = 'block';
    return;
  }

  const sendBtn = document.getElementById('sendEmailBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  showEmailStatus('📤 Sending your memories…', 'info');

  // Get strip image as base64 — compressed to stay under EmailJS 50KB limit
  const canvas = document.createElement('canvas');
  await renderStrip(state.photos, state.layout, state.filter, cfg, canvas);

  const smallCanvas = document.createElement('canvas');
  const maxW = 400;
  const scale = maxW / canvas.width;
  smallCanvas.width  = maxW;
  smallCanvas.height = Math.round(canvas.height * scale);
  const sctx = smallCanvas.getContext('2d');
  sctx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
  const stripBase64 = smallCanvas.toDataURL('image/jpeg', 0.45);

  // Load emailjs SDK
  await loadEmailJS();

  try {
    emailjs.init(cfg.ejsPublicKey);
    const result = await emailjs.send(cfg.ejsServiceId, cfg.ejsTemplateId, {
      to_email:    emailAddr,
      from_name:   cfg.ejsFromName || 'Totoro Photobooth',
      subject:     cfg.ejsSubject  || 'Your Totoro Booth Memories 🌿',
      message:     `Hi! Here are your Totoro Photobooth memories from ${formatDateShort()}. Enjoy reliving the magic! 🌿`,
      strip_image: stripBase64,
    });

    if (result.status === 200) {
      showEmailStatus('✅ Sent! Check your inbox 🌿', 'success');
      setTimeout(() => goPhase('done'), 1800);
    } else {
      showEmailStatus('❌ Send failed. Double-check your EmailJS credentials.', 'error');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Retry ✉️';
    }
  } catch(e) {
    const msg = e?.text || e?.message || 'Unknown error';
    showEmailStatus(`❌ Error: ${msg}`, 'error');
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

// ── PHASE: DONE ──────────────────────────────────────
async function initDone() {
  const cont = document.getElementById('doneStrips');
  if (!cont) return;
  cont.innerHTML = '';
  const canvas = document.createElement('canvas');
  cont.appendChild(canvas);
  await renderStrip(state.photos, state.layout, state.filter, window.BOOTH_CONFIG, canvas);
  canvas.style.width  = '100%';
  canvas.style.maxWidth = '360px';
  canvas.style.height = 'auto';
  canvas.style.borderRadius = '10px';
  canvas.style.margin = '1rem auto';
  canvas.style.display = 'block';
  canvas.style.boxShadow = '0 8px 28px rgba(0,0,0,0.35)';
  // Assign id for downloadFinalStrip
  canvas.id = 'finalCanvas';
}

// ── RESTART ──────────────────────────────────────────
function restartBooth() {
  state.photos  = [];
  state.clips   = [];
  state.filter  = 'none';
  state.photoIndex = 0;
  state.sessionActive = false;
  stopStream('main');
  stopStream('setup');
  stopStream('retake');

  // Full email UI reset so next session starts clean
  const sendBtn = document.getElementById('sendEmailBtn');
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send ✉️'; }
  const emailInput = document.getElementById('emailInput');
  if (emailInput) emailInput.value = '';
  const statusBox = document.getElementById('emailStatusBox');
  if (statusBox) { statusBox.style.display = 'none'; statusBox.textContent = ''; statusBox.className = 'email-status-box'; }

  goPhase('welcome');
}

// ── UTILS ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function getBestMime() {
  const types = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}
function setEl(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
function setStatus(msg) {
  const el = document.getElementById('shootStatus');
  if (el) el.textContent = msg;
}
function formatDateShort() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── RETAKE FROM SHOOT PAGE ────────────────────────────
function retakePhoto() { goPhase('retake'); }
function skipToFilter() { goPhase('filter'); }
