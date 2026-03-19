/* =====================================================
   admin.js — Admin panel · per-theme support
   ===================================================== */

// Per-theme config storage keys
const THEME_CONFIG_KEYS = {
  totoro:  'totoro_config',
  friends: 'friends_config',
};

// Default configs per theme
const THEME_DEFAULTS = {
  totoro: {
    bgType:'color', bgColor:'#4e6e50', gradStart:'#3d5a40', gradEnd:'#c8d5bc',
    gradDir:'to bottom', bgImage:null, bgFit:'cover', bgOpacity:1,
    stripPad:12, photoGap:8, borderRad:4,
    brandName:'🌿 Totoro Booth', brandTagline:'', brandColor:'#ffffff',
    brandFont:16, showDate:true, logoImage:null,
  },
  friends: {
    bgType:'color', bgColor:'#1a1a2e', gradStart:'#c0392b', gradEnd:'#e67e22',
    gradDir:'to bottom', bgImage:null, bgFit:'cover', bgOpacity:1,
    stripPad:12, photoGap:8, borderRad:4,
    brandName:'☕ Central Perk Booth', brandTagline:'', brandColor:'#ffffff',
    brandFont:16, showDate:true, logoImage:null,
  }
};

const THEME_PRESETS = {
  totoro:  ['#4e6e50','#3d5a40','#1a2b1c','#c8d5bc','#f5f0e8','#ede5d0','#c1773b','#7aacbf','#2c2c2c','#ffffff'],
  friends: ['#1a1a2e','#c0392b','#e74c3c','#e67e22','#f39c12','#f0c080','#fff8f0','#2c2c2c','#8e44ad','#ffffff'],
};

const THEME_META = {
  totoro:  { icon:'🌿', title:'Totoro Booth',       bannerText:'Editing: Totoro Theme',  headerClass:'totoro-header'  },
  friends: { icon:'☕', title:'Central Perk Booth',  bannerText:'Editing: Friends Theme', headerClass:'friends-header' },
};

let activeAdminTheme = 'totoro';
let adminCfg = {};         // current theme's strip config
let showDateFlag = true;

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('booth_theme') || 'totoro';
  switchAdminTheme(saved, document.getElementById(`adminTheme${saved.charAt(0).toUpperCase()+saved.slice(1)}`));
  populateEmailFields();
  renderTemplateGrid();
  renderSessionsList();
});

// ── THEME SWITCHING ────────────────────────────────────
function switchAdminTheme(name, btn) {
  activeAdminTheme = name;
  const meta = THEME_META[name];

  // Sidebar
  document.getElementById('sidebarIcon').textContent  = meta.icon;
  document.getElementById('sidebarTitle').textContent = meta.title;

  // Banner
  document.getElementById('themeBanner').className    = `theme-banner banner-${name}`;
  document.getElementById('themeBannerIcon').textContent = meta.icon;
  document.getElementById('themeBannerText').textContent = meta.bannerText;

  // Sidebar buttons
  document.querySelectorAll('#adminThemeTotoro,#adminThemeFriends').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Load this theme's strip config
  adminCfg = loadThemeConfig(name);
  populateFields();
  populatePresetColors(name);
  updatePreview();

  // Save active theme choice
  localStorage.setItem('booth_theme', name);
}

function loadThemeConfig(name) {
  const key = THEME_CONFIG_KEYS[name] || THEME_CONFIG_KEYS.totoro;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return Object.assign({}, THEME_DEFAULTS[name], JSON.parse(raw));
  } catch(e) {}
  return Object.assign({}, THEME_DEFAULTS[name]);
}

function saveThemeConfig(name, cfg) {
  const key = THEME_CONFIG_KEYS[name] || THEME_CONFIG_KEYS.totoro;
  try { localStorage.setItem(key, JSON.stringify(cfg)); } catch(e) {}
  // Also save to main config key if this is the active theme
  if (name === 'totoro') saveConfig(cfg);
}

// ── TAB SWITCHING ─────────────────────────────────────
function adminTab(name) {
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.id === `admin-${name}`));
  if (name === 'templates') renderTemplateGrid();
  if (name === 'sessions')  renderSessionsList();
  if (name === 'email')     populateEmailFields();
}

// ── POPULATE FIELDS ────────────────────────────────────
function populateFields() {
  setVal('bgColorPicker', adminCfg.bgColor   || '#4e6e50');
  setVal('bgColorHex',    adminCfg.bgColor   || '#4e6e50');
  setVal('gradStart',     adminCfg.gradStart  || '#3d5a40');
  setVal('gradEnd',       adminCfg.gradEnd    || '#c8d5bc');
  setVal('gradDir',       adminCfg.gradDir    || 'to bottom');
  setVal('bgOpacity',     Math.round((adminCfg.bgOpacity || 1) * 100));
  setVal('stripPad',      adminCfg.stripPad  ?? 12);
  setVal('photoGap',      adminCfg.photoGap  ?? 8);
  setVal('borderRad',     adminCfg.borderRad ?? 4);
  setVal('brandName',     adminCfg.brandName    || THEME_DEFAULTS[activeAdminTheme].brandName);
  setVal('brandTagline',  adminCfg.brandTagline || '');
  setVal('brandColor',    adminCfg.brandColor   || '#ffffff');
  setVal('brandFont',     adminCfg.brandFont    || 16);

  updateLabel('bgOpacityVal', Math.round((adminCfg.bgOpacity || 1) * 100));
  updateLabel('stripPadVal',  adminCfg.stripPad  ?? 12);
  updateLabel('photoGapVal',  adminCfg.photoGap  ?? 8);
  updateLabel('borderRadVal', adminCfg.borderRad ?? 4);
  updateLabel('brandFontVal', adminCfg.brandFont || 16);

  if (adminCfg.bgImage) showBgImageThumb(adminCfg.bgImage);
  else document.getElementById('bgImagePreviewRow').style.display = 'none';
  if (adminCfg.logoImage) showLogoThumb(adminCfg.logoImage);
  else document.getElementById('logoPreviewRow').style.display = 'none';

  setBgType(adminCfg.bgType || 'color', null);
}

function populateEmailFields() {
  // Totoro
  setVal('totoroServiceId',  localStorage.getItem('ejs_totoro_service')  || TOTORO_SERVICE_ID  || '');
  setVal('totoroTemplateId', localStorage.getItem('ejs_totoro_template') || TOTORO_TEMPLATE_ID || '');
  setVal('totoroPublicKey',  localStorage.getItem('ejs_totoro_pubkey')   || TOTORO_PUBLIC_KEY  || '');
  setVal('totoroFromName',   localStorage.getItem('ejs_totoro_from')     || TOTORO_FROM_NAME   || 'Totoro Photobooth');
  setVal('totoroSubject',    localStorage.getItem('ejs_totoro_subject')  || TOTORO_SUBJECT     || '');
  // Friends
  setVal('friendsServiceId',  localStorage.getItem('ejs_friends_service')  || FRIENDS_SERVICE_ID  || '');
  setVal('friendsTemplateId', localStorage.getItem('ejs_friends_template') || FRIENDS_TEMPLATE_ID || '');
  setVal('friendsPublicKey',  localStorage.getItem('ejs_friends_pubkey')   || FRIENDS_PUBLIC_KEY  || '');
  setVal('friendsFromName',   localStorage.getItem('ejs_friends_from')     || FRIENDS_FROM_NAME   || 'Central Perk Booth');
  setVal('friendsSubject',    localStorage.getItem('ejs_friends_subject')  || FRIENDS_SUBJECT     || '');
}

function populatePresetColors(theme) {
  const container = document.getElementById('presetColors');
  if (!container) return;
  container.innerHTML = '';
  (THEME_PRESETS[theme] || THEME_PRESETS.totoro).forEach(hex => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.style.background = hex;
    if (hex === '#ffffff') btn.style.border = '2px solid #ccc';
    btn.onclick = () => setPresetColor(hex);
    container.appendChild(btn);
  });
}

// ── BG TYPE ───────────────────────────────────────────
function setBgType(type, btn) {
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
  adminCfg.bgColor = v; updatePreview();
}
function syncColorFromHex() {
  let v = document.getElementById('bgColorHex').value.trim();
  if (!v.startsWith('#')) v = '#' + v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) { document.getElementById('bgColorPicker').value = v; adminCfg.bgColor = v; updatePreview(); }
}
function setPresetColor(hex) {
  document.getElementById('bgColorPicker').value = hex;
  document.getElementById('bgColorHex').value    = hex;
  adminCfg.bgColor = hex; updatePreview();
}
function updateGradient() {
  adminCfg.gradStart = document.getElementById('gradStart').value;
  adminCfg.gradEnd   = document.getElementById('gradEnd').value;
  adminCfg.gradDir   = document.getElementById('gradDir').value;
  updatePreview();
}
function updateBgOpacity() {
  const v = parseInt(document.getElementById('bgOpacity').value);
  updateLabel('bgOpacityVal', v); adminCfg.bgOpacity = v / 100; updatePreview();
}
function updateStripPad()  { const v = parseInt(document.getElementById('stripPad').value);  updateLabel('stripPadVal', v);  adminCfg.stripPad  = v; updatePreview(); }
function updatePhotoGap()  { const v = parseInt(document.getElementById('photoGap').value);  updateLabel('photoGapVal', v);  adminCfg.photoGap  = v; updatePreview(); }
function updateBorderRad() { const v = parseInt(document.getElementById('borderRad').value); updateLabel('borderRadVal', v); adminCfg.borderRad = v; updatePreview(); }
function updateBrandFont() { const v = parseInt(document.getElementById('brandFont').value); updateLabel('brandFontVal', v); adminCfg.brandFont = v; updatePreview(); }
function setBrandDate(val, btn) {
  showDateFlag = val; adminCfg.showDate = val;
  document.querySelectorAll('#admin-branding .toggle-row .toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  updatePreview();
}

// ── IMAGE UPLOADS ─────────────────────────────────────
function onBgImageUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { adminCfg.bgImage = ev.target.result; showBgImageThumb(ev.target.result); updatePreview(); };
  reader.readAsDataURL(file);
}
function showBgImageThumb(src) {
  const row = document.getElementById('bgImagePreviewRow');
  const img = document.getElementById('bgImageThumb');
  if (row && img) { img.src = src; row.style.display = 'flex'; }
}
function clearBgImage() { adminCfg.bgImage = null; document.getElementById('bgFileInput').value = ''; document.getElementById('bgImagePreviewRow').style.display = 'none'; updatePreview(); }
function onLogoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { adminCfg.logoImage = ev.target.result; showLogoThumb(ev.target.result); updatePreview(); };
  reader.readAsDataURL(file);
}
function showLogoThumb(src) {
  const row = document.getElementById('logoPreviewRow');
  const img = document.getElementById('logoThumb');
  if (row && img) { img.src = src; row.style.display = 'flex'; }
}
function clearLogo() { adminCfg.logoImage = null; document.getElementById('logoInput').value = ''; document.getElementById('logoPreviewRow').style.display = 'none'; updatePreview(); }

// ── LIVE PREVIEW ──────────────────────────────────────
let previewThrottle = null;
function updatePreview() {
  const brandEl = document.getElementById('brandName');
  if (brandEl) adminCfg.brandName = brandEl.value;
  const tagEl = document.getElementById('brandTagline');
  if (tagEl) adminCfg.brandTagline = tagEl.value;
  const colorEl = document.getElementById('brandColor');
  if (colorEl) adminCfg.brandColor = colorEl.value;
  const fitEl = document.getElementById('bgFitMode');
  if (fitEl) adminCfg.bgFit = fitEl.value;

  clearTimeout(previewThrottle);
  previewThrottle = setTimeout(async () => {
    const SAMPLE_PHOTOS = Array(4).fill(null);
    for (const id of ['adminPreviewCanvas','adminPreviewCanvas2']) {
      const c = document.getElementById(id);
      if (!c) continue;
      await renderStrip(SAMPLE_PHOTOS, '2x4', 'none', adminCfg, c);
      c.style.width = '100%'; c.style.height = 'auto';
    }
  }, 100);
}

// ── SAVE ──────────────────────────────────────────────
function saveAdminConfig() {
  saveThemeConfig(activeAdminTheme, adminCfg);
  window.BOOTH_CONFIG = adminCfg;
  showToast(`✅ ${THEME_META[activeAdminTheme].icon} ${activeAdminTheme === 'friends' ? 'Friends' : 'Totoro'} theme saved!`);
}

function saveEmailConfig() {
  // Save Totoro email
  localStorage.setItem('ejs_totoro_service',  document.getElementById('totoroServiceId').value.trim());
  localStorage.setItem('ejs_totoro_template', document.getElementById('totoroTemplateId').value.trim());
  localStorage.setItem('ejs_totoro_pubkey',   document.getElementById('totoroPublicKey').value.trim());
  localStorage.setItem('ejs_totoro_from',     document.getElementById('totoroFromName').value.trim());
  localStorage.setItem('ejs_totoro_subject',  document.getElementById('totoroSubject').value.trim());
  // Save Friends email
  localStorage.setItem('ejs_friends_service',  document.getElementById('friendsServiceId').value.trim());
  localStorage.setItem('ejs_friends_template', document.getElementById('friendsTemplateId').value.trim());
  localStorage.setItem('ejs_friends_pubkey',   document.getElementById('friendsPublicKey').value.trim());
  localStorage.setItem('ejs_friends_from',     document.getElementById('friendsFromName').value.trim());
  localStorage.setItem('ejs_friends_subject',  document.getElementById('friendsSubject').value.trim());

  showToast('✅ Both email configs saved!');
}

// ── TEST EMAIL ────────────────────────────────────────
async function sendTestEmail() {
  const addr    = document.getElementById('testEmailAddr').value.trim();
  const theme   = document.getElementById('testThemeSelect').value;
  const result  = document.getElementById('emailTestResult');
  if (!addr) { result.textContent = '⚠️ Enter test email'; result.style.color = '#c1773b'; return; }

  const svc = theme === 'friends'
    ? (localStorage.getItem('ejs_friends_service')  || FRIENDS_SERVICE_ID)
    : (localStorage.getItem('ejs_totoro_service')   || TOTORO_SERVICE_ID);
  const tpl = theme === 'friends'
    ? (localStorage.getItem('ejs_friends_template') || FRIENDS_TEMPLATE_ID)
    : (localStorage.getItem('ejs_totoro_template')  || TOTORO_TEMPLATE_ID);
  const key = theme === 'friends'
    ? (localStorage.getItem('ejs_friends_pubkey')   || FRIENDS_PUBLIC_KEY)
    : (localStorage.getItem('ejs_totoro_pubkey')    || TOTORO_PUBLIC_KEY);
  const from = theme === 'friends'
    ? (localStorage.getItem('ejs_friends_from')     || FRIENDS_FROM_NAME)
    : (localStorage.getItem('ejs_totoro_from')      || TOTORO_FROM_NAME);

  if (!svc || !tpl || !key) { result.textContent = '❌ Fill in all fields for this theme first.'; result.style.color = '#c83232'; return; }
  result.textContent = '📤 Sending test…'; result.style.color = '#6b7c6e';

  await loadEmailJS();
  try {
    emailjs.init({ publicKey: key });
    const res = await emailjs.send(svc, tpl, {
      to_email: addr, from_name: from,
      subject: `Test — ${theme === 'friends' ? '☕ Friends' : '🌿 Totoro'} Booth`,
      message: 'This is a test email from your Photobooth admin panel!',
      strip_image: '',
    });
    result.textContent = res.status === 200 ? '✅ Test sent!' : '❌ Failed';
    result.style.color  = res.status === 200 ? '#3d5a40' : '#c83232';
  } catch(e) { result.textContent = `❌ ${e?.text || e?.message}`; result.style.color = '#c83232'; }
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
  if (!templates.length) { grid.innerHTML = '<p style="color:#b5a99a;font-size:.85rem">No templates saved yet.</p>'; return; }
  grid.innerHTML = '';
  templates.forEach((tmpl, i) => {
    const card = document.createElement('div');
    card.className = 'template-card';
    const canvas = document.createElement('canvas');
    card.appendChild(canvas);
    renderStrip(Array(4).fill(null), '2x4', 'none', tmpl.config, canvas).then(() => {
      canvas.style.width = '100%'; canvas.style.height = 'auto';
    });
    const name = document.createElement('div');
    name.className = 'template-name';
    name.textContent = `${tmpl.theme === 'friends' ? '☕' : '🌿'} ${tmpl.name || `Template ${i+1}`}`;
    card.appendChild(name);
    const row = document.createElement('div');
    row.className = 'template-actions';
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-secondary btn-sm'; loadBtn.textContent = 'Load';
    loadBtn.onclick = () => { adminCfg = Object.assign({}, tmpl.config); populateFields(); updatePreview(); showToast('Template loaded!'); };
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-ghost'; delBtn.textContent = '🗑';
    delBtn.onclick = () => { deleteTemplate(i); renderTemplateGrid(); };
    row.appendChild(loadBtn); row.appendChild(delBtn);
    card.appendChild(row);
    grid.appendChild(card);
  });
}

function saveCurrentAsTemplate() {
  const name = prompt('Template name:', `${activeAdminTheme === 'friends' ? '☕' : '🌿'} Template ${loadTemplates().length + 1}`);
  if (!name) return;
  saveTemplate({ name, theme: activeAdminTheme, config: Object.assign({}, adminCfg), date: new Date().toISOString() });
  renderTemplateGrid();
  showToast('Template saved!');
}

// ── SESSIONS ──────────────────────────────────────────
function renderSessionsList() {
  const list = document.getElementById('sessionsList');
  if (!list) return;
  const sessions = loadSessions();
  if (!sessions.length) { list.innerHTML = '<div class="empty-sessions">No sessions recorded yet.</div>'; return; }
  list.innerHTML = '';
  sessions.forEach(s => {
    const row = document.createElement('div');
    row.className = 'session-row';
    row.innerHTML = `
      <span class="session-icon">${s.theme === 'friends' ? '☕' : '📸'}</span>
      <div class="session-info">
        <div class="session-date">${new Date(s.date).toLocaleString()}</div>
        <div class="session-meta">${s.theme === 'friends' ? 'Friends' : 'Totoro'} · ${s.layout} · ${s.photos} photos</div>
      </div>`;
    list.appendChild(row);
  });
}

function clearAllSessions() {
  if (confirm('Clear all session history?')) { clearSessions(); renderSessionsList(); showToast('Sessions cleared'); }
}

// ── DRAG DROP ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const drop = document.getElementById('bgFileDrop');
  if (!drop) return;
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
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
