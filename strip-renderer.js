/* =====================================================
   strip-renderer.js — Strip canvas rendering engine
   Builds the photo strip image from photos + config
   ===================================================== */

const PHOTO_W  = 360;   // base photo width in strip canvas
const PHOTO_H  = 270;   // 4:3 ratio

/* ── LAYOUT DEFINITIONS ───────────────────────────── */
const LAYOUTS = {
  '2x4': { cols: 1, rows: 4, copies: 2, totalPhotos: 4 },
  '1x4': { cols: 1, rows: 4, copies: 1, totalPhotos: 4 },
  '2x2': { cols: 2, rows: 2, copies: 1, totalPhotos: 4 },
  '1x3': { cols: 1, rows: 3, copies: 2, totalPhotos: 3 },
};

function getLayout(name) { return LAYOUTS[name] || LAYOUTS['2x4']; }
function getTotalPhotos(name) { return getLayout(name).totalPhotos; }

/* ── SAMPLE PLACEHOLDER PHOTOS (grey gradient) ───── */
function makePlaceholderCanvas(index) {
  const c = document.createElement('canvas');
  c.width = PHOTO_W; c.height = PHOTO_H;
  const ctx = c.getContext('2d');
  const colors = ['#2a3f2c','#3d5a40','#4e7153','#6b7c6e'];
  ctx.fillStyle = colors[index % colors.length];
  ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Photo ${index + 1}`, PHOTO_W / 2, PHOTO_H / 2);
  return c;
}

/* ── LOAD IMAGE PROMISE ───────────────────────────── */
function loadImg(src) {
  return new Promise((res, rej) => {
    if (!src) { res(null); return; }
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/* ── APPLY PIXEL FILTER ───────────────────────────── */
function applyPixelFilter(ctx, w, h, filterName) {
  if (!filterName || filterName === 'none') return;
  const id = ctx.getImageData(0, 0, w, h);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    let nr = r, ng = g, nb = b;
    if (filterName === 'bw') {
      const grey = r*.299 + g*.587 + b*.114;
      nr = ng = nb = Math.min(255, grey * 1.05);
    } else if (filterName === 'sepia') {
      nr = Math.min(255, r*.393 + g*.769 + b*.189);
      ng = Math.min(255, r*.349 + g*.686 + b*.168);
      nb = Math.min(255, r*.272 + g*.534 + b*.131);
    } else if (filterName === 'warm') {
      nr = Math.min(255, r * 1.12);
      ng = Math.min(255, g * 1.03);
      nb = Math.min(255, b * 0.87);
    } else if (filterName === 'cool') {
      nr = Math.min(255, r * 0.88);
      ng = Math.min(255, g * 1.02);
      nb = Math.min(255, b * 1.14);
    } else if (filterName === 'dramatic') {
      const grey = r*.299 + g*.587 + b*.114;
      nr = Math.min(255, (r - grey) * 1.4 + grey);
      ng = Math.min(255, (g - grey) * 1.4 + grey);
      nb = Math.min(255, (b - grey) * 1.4 + grey);
      nr = Math.min(255, nr * 0.85);
      nb = Math.min(255, nb * 0.85);
    } else if (filterName === 'fade') {
      nr = Math.min(255, r * 0.85 + 35);
      ng = Math.min(255, g * 0.85 + 30);
      nb = Math.min(255, b * 0.85 + 28);
    }
    d[i] = nr; d[i+1] = ng; d[i+2] = nb;
  }
  ctx.putImageData(id, 0, 0);
}

/* ══════════════════════════════════════════════════
   MAIN: renderStrip
   photos: array of dataUrl strings (or null for placeholders)
   layout: '2x4' | '1x4' | '2x2' | '1x3'
   filter: filter name string
   config: BOOTH_CONFIG
   targetCanvas: HTMLCanvasElement to draw on
   returns: Promise<void>
══════════════════════════════════════════════════ */
async function renderStrip(photos, layout, filter, config, targetCanvas) {
  const cfg = config || window.BOOTH_CONFIG || {};
  const ly  = getLayout(layout);

  const PAD     = cfg.stripPad  ?? 12;
  const GAP     = cfg.photoGap  ?? 8;
  const RAD     = cfg.borderRad ?? 4;
  const BRAND_H = 56;

  const stripW = ly.cols * PHOTO_W + (ly.cols - 1) * GAP + PAD * 2;
  const stripH = ly.rows * PHOTO_H + (ly.rows - 1) * GAP + PAD * 2 + BRAND_H;

  // Canvas total width = copies side by side
  const COPY_GAP = 16;
  const canvasW  = ly.copies * stripW + (ly.copies - 1) * COPY_GAP;
  const canvasH  = stripH;

  targetCanvas.width  = canvasW;
  targetCanvas.height = canvasH;

  const ctx = targetCanvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Load all photos
  const loadedImgs = await Promise.all(
    Array.from({ length: ly.totalPhotos }, (_, i) =>
      photos[i] ? loadImg(photos[i]) : Promise.resolve(null)
    )
  );

  for (let copy = 0; copy < ly.copies; copy++) {
    const ox = copy * (stripW + COPY_GAP); // x offset for this copy

    /* ─ Draw strip background ─ */
    ctx.save();
    roundRect(ctx, ox, 0, stripW, stripH, 8);
    ctx.clip();

    if (cfg.bgType === 'gradient') {
      let grad;
      if (cfg.gradDir === 'to right') {
        grad = ctx.createLinearGradient(ox, 0, ox + stripW, 0);
      } else if (cfg.gradDir === '135deg') {
        grad = ctx.createLinearGradient(ox, 0, ox + stripW, stripH);
      } else if (cfg.gradDir === 'to top') {
        grad = ctx.createLinearGradient(ox, stripH, ox, 0);
      } else {
        grad = ctx.createLinearGradient(ox, 0, ox, stripH);
      }
      grad.addColorStop(0, cfg.gradStart || '#3d5a40');
      grad.addColorStop(1, cfg.gradEnd   || '#c8d5bc');
      ctx.fillStyle = grad;
      ctx.fillRect(ox, 0, stripW, stripH);
    } else if (cfg.bgType === 'image' && cfg.bgImage) {
      const bgImg = await loadImg(cfg.bgImage);
      if (bgImg) {
        ctx.globalAlpha = cfg.bgOpacity ?? 1;
        if (cfg.bgFit === 'contain') {
          const scale = Math.min(stripW / bgImg.width, stripH / bgImg.height);
          const dw = bgImg.width * scale, dh = bgImg.height * scale;
          ctx.fillStyle = cfg.bgColor || '#4e6e50';
          ctx.fillRect(ox, 0, stripW, stripH);
          ctx.drawImage(bgImg, ox + (stripW - dw) / 2, (stripH - dh) / 2, dw, dh);
        } else if (cfg.bgFit === 'repeat') {
          ctx.fillStyle = cfg.bgColor || '#4e6e50';
          ctx.fillRect(ox, 0, stripW, stripH);
          const pat = ctx.createPattern(bgImg, 'repeat');
          if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, 0, stripW, stripH); }
        } else {
          const scale = Math.max(stripW / bgImg.width, stripH / bgImg.height);
          const dw = bgImg.width * scale, dh = bgImg.height * scale;
          ctx.drawImage(bgImg, ox + (stripW - dw) / 2, (stripH - dh) / 2, dw, dh);
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = cfg.bgColor || '#4e6e50';
        ctx.fillRect(ox, 0, stripW, stripH);
      }
    } else {
      ctx.fillStyle = cfg.bgColor || '#4e6e50';
      ctx.fillRect(ox, 0, stripW, stripH);
    }

    ctx.restore();

    /* ─ Draw photos ─ */
    let photoIndex = 0;
    for (let row = 0; row < ly.rows; row++) {
      for (let col = 0; col < ly.cols; col++) {
        const px = ox + PAD + col * (PHOTO_W + GAP);
        const py = PAD + row * (PHOTO_H + GAP);

        ctx.save();
        roundRect(ctx, px, py, PHOTO_W, PHOTO_H, RAD);
        ctx.clip();

        const img = loadedImgs[photoIndex];
        if (img) {
          // Draw photo maintaining aspect ratio (cover)
          const scale = Math.max(PHOTO_W / img.width, PHOTO_H / img.height);
          const dw = img.width * scale, dh = img.height * scale;
          ctx.drawImage(img, px + (PHOTO_W - dw) / 2, py + (PHOTO_H - dh) / 2, dw, dh);
          // Apply filter to just this photo region
          if (filter && filter !== 'none') {
            const imgData = ctx.getImageData(px, py, PHOTO_W, PHOTO_H);
            const tmp = document.createElement('canvas');
            tmp.width = PHOTO_W; tmp.height = PHOTO_H;
            const tctx = tmp.getContext('2d');
            tctx.putImageData(imgData, 0, 0);
            applyPixelFilter(tctx, PHOTO_W, PHOTO_H, filter);
            ctx.drawImage(tmp, px, py);
          }
        } else {
          // Placeholder
          const ph = makePlaceholderCanvas(photoIndex);
          ctx.drawImage(ph, px, py, PHOTO_W, PHOTO_H);
        }
        ctx.restore();
        photoIndex++;
      }
    }

    /* ─ Brand footer ─ */
    const fy = stripH - BRAND_H;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(ox, fy, stripW, 1);

    // Logo
    const logoImg = cfg.logoImage ? await loadImg(cfg.logoImage) : null;
    let textX = ox + stripW / 2;
    let textY = fy + BRAND_H * 0.38;

    if (logoImg) {
      const lh = 24;
      const lw = (logoImg.width / logoImg.height) * lh;
      ctx.drawImage(logoImg, ox + (stripW - lw) / 2, fy + 8, lw, lh);
      textY = fy + BRAND_H * 0.72;
    }

    const brandColor = cfg.brandColor || '#ffffff';
    const brandFont  = cfg.brandFont  || 16;
    ctx.fillStyle    = brandColor;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = `italic ${brandFont}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(cfg.brandName || '🌿 Totoro Booth', textX, textY);

    if (cfg.brandTagline) {
      ctx.font      = `${brandFont * 0.7}px "Nunito", sans-serif`;
      ctx.fillStyle = brandColor.replace(')', ',0.7)').replace('rgb', 'rgba').replace('#', 'rgba(').split('rgba(').pop();
      // simpler:
      ctx.globalAlpha = 0.65;
      ctx.fillStyle   = brandColor;
      ctx.font        = `${Math.max(10, brandFont - 4)}px "Nunito", sans-serif`;
      ctx.fillText(cfg.brandTagline, textX, textY + brandFont + 2);
      ctx.globalAlpha = 1;
    }

    if (cfg.showDate !== false) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle   = brandColor;
      ctx.font        = `${Math.max(9, brandFont - 6)}px "Nunito", sans-serif`;
      ctx.fillText(formatDateShort(), textX, fy + BRAND_H - 9);
      ctx.globalAlpha = 1;
    }
  }
}

/* ── HELPER: roundRect path ───────────────────────── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function formatDateShort() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
