/* =====================================================
   config.js — Shared config store (localStorage)
   ===================================================== */

const CONFIG_KEY    = 'totoro_config';
const SESSIONS_KEY  = 'totoro_sessions';
const TEMPLATES_KEY = 'totoro_templates';

const DEFAULT_CONFIG = {
  // Background
  bgType:    'color',       // 'color' | 'gradient' | 'image'
  bgColor:   '#4e6e50',
  gradStart: '#3d5a40',
  gradEnd:   '#c8d5bc',
  gradDir:   'to bottom',
  bgImage:   null,          // base64 string
  bgFit:     'cover',
  bgOpacity: 1,
  // Strip layout
  stripPad:   12,
  photoGap:   8,
  borderRad:  4,
  // Branding
  brandName:    '🌿 Totoro Booth',
  brandTagline: '',
  brandColor:   '#ffffff',
  brandFont:    16,
  showDate:     true,
  logoImage:    null,       // base64
  // Email (EmailJS)
  ejsServiceId:  '',
  ejsTemplateId: '',
  ejsPublicKey:  '',
  ejsFromName:   'Totoro Photobooth',
  ejsSubject:    'Your Totoro Booth Memories 🌿',
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
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

// Global config reference (populated on each page load)
window.BOOTH_CONFIG = loadConfig();
