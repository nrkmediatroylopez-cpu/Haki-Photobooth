/* =====================================================
   config.js — Shared config + per-theme email settings

   ╔══════════════════════════════════════════════════════╗
   ║  FILL IN YOUR EMAILJS CREDENTIALS BELOW             ║
   ║  Get them free at https://www.emailjs.com           ║
   ║                                                     ║
   ║  Steps:                                             ║
   ║  1. Sign up → Email Services → Add Gmail            ║
   ║  2. Email Templates → Create template per theme     ║
   ║  3. Account → General → copy Public Key             ║
   ║  4. Paste all values below, re-upload to GitHub     ║
   ╚══════════════════════════════════════════════════════╝
   ===================================================== */

// ══════════════════════════════════════════════════════
//  🌿 TOTORO THEME — EmailJS credentials
// ══════════════════════════════════════════════════════
const TOTORO_SERVICE_ID  = 'service_4z99scc';
const TOTORO_TEMPLATE_ID = 'template_c1os7hd';
const TOTORO_PUBLIC_KEY  = 'koN-S1d-PVXq9wTOm';
const TOTORO_FROM_NAME   = 'Totoro Photobooth';
const TOTORO_SUBJECT     = 'Happy 9th Monthsary Haki! I LOVE YOUUU SO MUCHH 🌿';

// ══════════════════════════════════════════════════════
//  ☕ FRIENDS THEME — EmailJS credentials
//  Only TEMPLATE_ID needs to be different.
//  Paste your Friends template ID below when ready.
// ══════════════════════════════════════════════════════
const FRIENDS_SERVICE_ID  = 'service_4z99scc';
const FRIENDS_TEMPLATE_ID = '';               // ← paste e.g. 'template_xxxxxxx'
const FRIENDS_PUBLIC_KEY  = 'koN-S1d-PVXq9wTOm';
const FRIENDS_FROM_NAME   = 'Central Perk Booth';
const FRIENDS_SUBJECT     = 'Your Central Perk Booth Memories ☕';

// ─────────────────────────────────────────────────────

const CONFIG_KEY    = 'totoro_config';
const SESSIONS_KEY  = 'totoro_sessions';
const TEMPLATES_KEY = 'totoro_templates';

const DEFAULT_CONFIG = {
  bgType:    'color',
  bgColor:   '#4e6e50',
  gradStart: '#3d5a40',
  gradEnd:   '#c8d5bc',
  gradDir:   'to bottom',
  bgImage:   null,
  bgFit:     'cover',
  bgOpacity: 1,
  stripPad:   12,
  photoGap:   8,
  borderRad:  4,
  brandName:    '🌿 Totoro Booth',
  brandTagline: '',
  brandColor:   '#ffffff',
  brandFont:    16,
  showDate:     true,
  logoImage:    null,
  ejsServiceId:  TOTORO_SERVICE_ID,
  ejsTemplateId: TOTORO_TEMPLATE_ID,
  ejsPublicKey:  TOTORO_PUBLIC_KEY,
  ejsFromName:   TOTORO_FROM_NAME,
  ejsSubject:    TOTORO_SUBJECT,
};

// ── Per-theme email config ────────────────────────────
// getEmailConfigForTheme() is called by app.js sendEmail()
// It ALWAYS returns the hardcoded values as priority —
// localStorage admin overrides are merged on top if present.
function getEmailConfigForTheme(themeName) {
  if (themeName === 'friends') {
    return {
      ejsServiceId:  localStorage.getItem('ejs_friends_service')  || FRIENDS_SERVICE_ID,
      ejsTemplateId: localStorage.getItem('ejs_friends_template') || FRIENDS_TEMPLATE_ID,
      ejsPublicKey:  localStorage.getItem('ejs_friends_pubkey')   || FRIENDS_PUBLIC_KEY,
      ejsFromName:   localStorage.getItem('ejs_friends_from')     || FRIENDS_FROM_NAME,
      ejsSubject:    localStorage.getItem('ejs_friends_subject')  || FRIENDS_SUBJECT,
    };
  }
  // Default: totoro
  return {
    ejsServiceId:  localStorage.getItem('ejs_totoro_service')  || TOTORO_SERVICE_ID,
    ejsTemplateId: localStorage.getItem('ejs_totoro_template') || TOTORO_TEMPLATE_ID,
    ejsPublicKey:  localStorage.getItem('ejs_totoro_pubkey')   || TOTORO_PUBLIC_KEY,
    ejsFromName:   localStorage.getItem('ejs_totoro_from')     || TOTORO_FROM_NAME,
    ejsSubject:    localStorage.getItem('ejs_totoro_subject')  || TOTORO_SUBJECT,
  };
}

// isEmailConfigured() — used by initEmail() to decide
// whether to show the quick-config panel or hide it.
// Returns true if ALL three required fields are filled.
function isEmailConfigured(themeName) {
  const c = getEmailConfigForTheme(themeName);
  return !!(c.ejsServiceId && c.ejsTemplateId && c.ejsPublicKey);
}

function loadConfig() {
  try {
    const raw    = localStorage.getItem(CONFIG_KEY);
    const saved  = raw ? JSON.parse(raw) : {};
    const merged = Object.assign({}, DEFAULT_CONFIG, saved);

    // Always enforce hardcoded Totoro credentials as fallback
    if (!merged.ejsServiceId)  merged.ejsServiceId  = TOTORO_SERVICE_ID;
    if (!merged.ejsTemplateId) merged.ejsTemplateId = TOTORO_TEMPLATE_ID;
    if (!merged.ejsPublicKey)  merged.ejsPublicKey  = TOTORO_PUBLIC_KEY;
    if (!merged.ejsFromName)   merged.ejsFromName   = TOTORO_FROM_NAME;
    if (!merged.ejsSubject)    merged.ejsSubject    = TOTORO_SUBJECT;

    return merged;
  } catch(e) {}
  return Object.assign({}, DEFAULT_CONFIG);
}

function saveConfig(cfg) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch(e) {}
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveSession(entry) {
  try {
    const sessions = loadSessions();
    sessions.unshift(entry);
    if (sessions.length > 20) sessions.length = 20;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch(e) {}
}

function clearSessions() {
  localStorage.removeItem(SESSIONS_KEY);
}

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveTemplate(template) {
  const templates = loadTemplates();
  templates.unshift(template);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function deleteTemplate(index) {
  const templates = loadTemplates();
  templates.splice(index, 1);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

// Global config reference
window.BOOTH_CONFIG = loadConfig();
