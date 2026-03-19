/* =====================================================
   admin.js — Admin panel logic
   ===================================================== */

let adminCfg = loadConfig();
let bgType   = adminCfg.bgType || 'color';
let showDateFlag = adminCfg.showDate !== false;

// Sample placeholder photos for previews
const SAMPLE_PHOTOS = Array(4).fill(null);

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateFields();
  updatePreview();
  renderTemplateGrid();
  renderSessionsList();
});

function populateFields() {
  setVal('bgColorPicker',  adminCfg.bgColor   || '#4e6e50');
  setVal('bgColorHex',     adminCfg.bgColor   || '#4e6e50');
  setVal('gradStart',      adminCfg.gradStart  || '#3d5a40');
  setVal('gradEnd',        adminCfg.gradEnd    || '#c8d5bc');
  setVal('gradDir',        adminCfg.gradDir    || 'to bottom');
  setVal('bgOpacity',      Math.round((adminCfg.bgOpacity || 1) * 100));
  setVal('stripPad',       adminCfg.stripPad  ?? 12);
  setVal('photoGap',       adminCfg.photoGap  ?? 8);
  setVal('borderRad',      adminCfg.borderRad ?? 4);
  setVal('brandName',      adminCfg.brandName    || '🌿 Totoro Booth');
  setVal('brandTagline',   adminCfg.brandTagline || '');
  setVal('brandColor',     adminCfg.brandColor   || '#ffffff');
  setVal('brandFont',      adminCfg.brandFont    || 16);
  setVal('ejsServiceId',   adminCfg.ejsServiceId  || '');
  setVal('ejsTemplateId',  adminCfg.ejsTemplateId || '');
  setVal('ejsPublicKey',   adminCfg.ejsPublicKey  || '');
  setVal('ejsFromName',    adminCfg.ejsFromName   || 'Totoro Photobooth');
  setVal('ejsSubject',     adminCfg.ejsSubject    || 'Your Totoro Booth Memories 🌿');

  // Slider labels
  updateLabel('bgOpacityVal', Math.round((adminCfg.bgOpacity || 1) * 100));
  updateLabel('stripPadVal',  adminCfg.stripPad  ?? 12);
  updateLabel('photoGapVal',  adminCfg.photoGap  ?? 8);
  updateLabel('borderRadVal', adminCfg.borderRad ?? 4);
  updateLabel('brandFontVal', adminCfg.brandFont || 16);

  // Logo/bg image
  if (adminCfg.bgImage)    showBgImageThumb(adminCfg.bgImage);
  if (adminCfg.logoImage)  showLogoThumb(adminCfg.logoImage);

  setBgType(adminCfg.bgType || 'color', null);
}

// ── TAB SWITCHING ─────────────────────────────────────
function adminTab(name) {
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(name.split('').slice(0,3).join(''))));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.id === `admin-${name}`));
  if (name === 'templates') renderTemplateGrid();
  if (name === 'sessions')  renderSessionsList();
}

// ── BG TYPE ──────────────────────────────────────────
function setBgType(type, btn) {
  bgType = type;
  adminCfg.bgType = type;
  document.getElementById('bgColorGroup').style.display    = type === 'color'    ? '' : 'none';
  document.getElementById('bgGradientGroup').style.display = type === 'gradient' ? '' : 'none';
  document.getElementById('bgImageGroup').style.display    = type === 'image'    ? '' : 'none';
  if (btn) {
    document.querySelectorAll('#admin-background .toggle-row .toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  updatePreview();
}

function updateBgColor() {
  const v = document.getElementById('bgColorPicker').value;
  document.getElementById('bgColorHex').value = v;
  adminCfg.bgColor = v;
  updatePreview();
}
function syncColorFromHex() {
  let v = document.getElementById('bgColorHex').value.trim();
  if (!v.startsWith('#')) v = '#' + v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    document.getElementById('bgColorPicker').value = v;
    adminCfg.bgColor = v;
    updatePreview();
  }
}
function setPresetColor(hex) {
  document.getElementById('bgColorPicker').value = hex;
  document.getElementById('bgColorHex').value    = hex;
  adminCfg.bgColor = hex;
  updatePreview();
}
function updateGradient() {
  adminCfg.gradStart = document.getElementById('gradStart').value;
  adminCfg.gradEnd   = document.getElementById('gradEnd').value;
  adminCfg.gradDir   = document.getElementById('gradDir').value;
  updatePreview();
}
function updateBgOpacity() {
  const v = parseInt(document.getElementById('bgOpacity').value);
  updateLabel('bgOpacityVal', v);
  adminCfg.bgOpacity = v / 100;
  updatePreview();
}
function updateStripPad() {
  const v = parseInt(document.getElementById('stripPad').value);
  updateLabel('stripPadVal', v);
  adminCfg.stripPad = v;
  updatePreview();
}
function updatePhotoGap() {
  const v = parseInt(document.getElementById('photoGap').value);
  updateLabel('photoGapVal', v);
  adminCfg.photoGap = v;
  updatePreview();
}
function updateBorderRad() {
  const v = parseInt(document.getElementById('borderRad').value);
  updateLabel('borderRadVal', v);
  adminCfg.borderRad = v;
  updatePreview();
}
function updateBrandFont() {
  const v = parseInt(document.getElementById('brandFont').value);
  updateLabel('brandFontVal', v);
  adminCfg.brandFont = v;
  updatePreview();
}
function setBrandDate(val, btn) {
  showDateFlag = val;
  adminCfg.showDate = val;
  document.querySelectorAll('#admin-branding .toggle-row .toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  updatePreview();
}

// ── IMAGE UPLOADS ─────────────────────────────────────
function onBgImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    adminCfg.bgImage = ev.target.result;
    showBgImageThumb(ev.target.result);
    updatePreview();
  };
  reader.readAsDataURL(file);
}
function showBgImageThumb(src) {
  const row = document.getElementById('bgImagePreviewRow');
  const img = document.getElementById('bgImageThumb');
  if (row && img) { img.src = src; row.style.display = 'flex'; row.style.alignItems = 'center'; }
}
function clearBgImage() {
  adminCfg.bgImage = null;
  document.getElementById('bgFileInput').value = '';
  document.getElementById('bgImagePreviewRow').style.display = 'none';
  updatePreview();
}

function onLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    adminCfg.logoImage = ev.target.result;
    showLogoThumb(ev.target.result);
    updatePreview();
  };
  reader.readAsDataURL(file);
}
function showLogoThumb(src) {
  const row = document.getElementById('logoPreviewRow');
  const img = document.getElementById('logoThumb');
  if (row && img) { img.src = src; row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '.4rem'; }
}
function clearLogo() {
  adminCfg.logoImage = null;
  document.getElementById('logoInput').value = '';
  document.getElementById('logoPreviewRow').style.display = 'none';
  updatePreview();
}

// ── LIVE PREVIEW ──────────────────────────────────────
let previewThrottle = null;
function updatePreview() {
  // Sync brand fields to adminCfg
  const syncFields = ['brandName','brandTagline','brandColor','bgFitMode'];
  syncFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = id === 'bgFitMode' ? 'bgFit' : id;
    adminCfg[key] = el.value;
  });

  clearTimeout(previewThrottle);
  previewThrottle = setTimeout(async () => {
    const c1 = document.getElementById('adminPreviewCanvas');
    const c2 = document.getElementById('adminPreviewCanvas2');
    if (c1) {
      await renderStrip(SAMPLE_PHOTOS, '2x4', 'none', adminCfg, c1);
      c1.style.width  = '100%';
      c1.style.height = 'auto';
    }
    if (c2) {
      await renderStrip(SAMPLE_PHOTOS, '2x4', 'none', adminCfg, c2);
      c2.style.width  = '100%';
      c2.style.height = 'auto';
    }
  }, 100);
}

// ── SAVE CONFIG ───────────────────────────────────────
function saveAdminConfig() {
  // Email fields
  ['ejsServiceId','ejsTemplateId','ejsPublicKey','ejsFromName','ejsSubject'].forEach(id => {
    const el = document.getElementById(id);
    if (el) adminCfg[id] = el.value.trim();
  });
  saveConfig(adminCfg);
  window.BOOTH_CONFIG = adminCfg;
  showToast('✅ Saved!');
}
function saveEmailConfig() {
  saveAdminConfig();
}

// ── TEST EMAIL ────────────────────────────────────────
async function sendTestEmail() {
  const addr = document.getElementById('testEmailAddr').value.trim();
  const result = document.getElementById('emailTestResult');
  if (!addr) { result.textContent = '⚠️ Enter test email'; result.style.color = '#c1773b'; return; }
  result.textContent = '📤 Sending test…'; result.style.color = '#6b7c6e';

  const cfg = adminCfg;
  if (!cfg.ejsServiceId || !cfg.ejsTemplateId || !cfg.ejsPublicKey) {
    result.textContent = '❌ Fill in all EmailJS fields first.'; result.style.color = '#c83232'; return;
  }
  await loadEmailJS();
  try {
    emailjs.init(cfg.ejsPublicKey);
    const res = await emailjs.send(cfg.ejsServiceId, cfg.ejsTemplateId, {
      to_email:    addr,
      from_name:   cfg.ejsFromName || 'Totoro Photobooth',
      subject:     'Test — ' + (cfg.ejsSubject || 'Totoro Booth'),
      message:     'This is a test email from your Totoro Photobooth admin panel! 🌿',
      strip_image: '',
    });
    result.textContent = res.status === 200 ? '✅ Test sent!' : '❌ Send failed';
    result.style.color = res.status === 200 ? '#3d5a40' : '#c83232';
  } catch(e) {
    result.textContent = `❌ ${e.message}`; result.style.color = '#c83232';
  }
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

// ── TEMPLATES ─────────────────────────────────────────
function renderTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  if (!grid) return;
  const templates = loadTemplates();
  if (templates.length === 0) {
    grid.innerHTML = '<p style="color:#b5a99a;font-size:.85rem">No templates saved yet.</p>';
    return;
  }
  grid.innerHTML = '';
  templates.forEach((tmpl, i) => {
    const card = document.createElement('div');
    card.className = 'template-card';

    const canvas = document.createElement('canvas');
    card.appendChild(canvas);
    renderStrip(SAMPLE_PHOTOS, '2x4', 'none', tmpl.config, canvas).then(() => {
      canvas.style.width = '100%'; canvas.style.height = 'auto';
    });

    const name = document.createElement('div');
    name.className = 'template-name';
    name.textContent = tmpl.name || `Template ${i + 1}`;
    card.appendChild(name);

    const row = document.createElement('div');
    row.className = 'template-actions';
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-secondary btn-sm';
    loadBtn.textContent = 'Load';
    loadBtn.onclick = () => { adminCfg = Object.assign({}, tmpl.config); populateFields(); updatePreview(); showToast('Template loaded!'); };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-ghost';
    delBtn.textContent = '🗑';
    delBtn.onclick = () => { deleteTemplate(i); renderTemplateGrid(); };
    row.appendChild(loadBtn);
    row.appendChild(delBtn);
    card.appendChild(row);
    grid.appendChild(card);
  });
}

function saveCurrentAsTemplate() {
  const name = prompt('Template name:', `Template ${loadTemplates().length + 1}`);
  if (!name) return;
  saveTemplate({ name, config: Object.assign({}, adminCfg), date: new Date().toISOString() });
  renderTemplateGrid();
  showToast('Template saved!');
}

// ── SESSIONS ──────────────────────────────────────────
function renderSessionsList() {
  const list = document.getElementById('sessionsList');
  if (!list) return;
  const sessions = loadSessions();
  if (sessions.length === 0) {
    list.innerHTML = '<div class="empty-sessions">No sessions recorded yet.</div>';
    return;
  }
  list.innerHTML = '';
  sessions.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'session-row';
    row.innerHTML = `
      <span class="session-icon">📸</span>
      <div class="session-info">
        <div class="session-date">${new Date(s.date).toLocaleString()}</div>
        <div class="session-meta">Layout: ${s.layout} · ${s.photos} photos</div>
      </div>`;
    list.appendChild(row);
  });
}

function clearAllSessions() {
  if (confirm('Clear all session history?')) {
    clearSessions();
    renderSessionsList();
    showToast('Sessions cleared');
  }
}

// ── DRAG DROP on file zone ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const drop = document.getElementById('bgFileDrop');
  if (!drop) return;
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', ()=> drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => { adminCfg.bgImage = ev.target.result; showBgImageThumb(ev.target.result); updatePreview(); };
      reader.readAsDataURL(file);
    }
  });
});

// ── TOAST ─────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#3d5a40;color:#fff;padding:.6rem 1.4rem;border-radius:40px;font-weight:700;font-size:.88rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);transition:opacity .3s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

// ── UTILS ─────────────────────────────────────────────
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function updateLabel(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
