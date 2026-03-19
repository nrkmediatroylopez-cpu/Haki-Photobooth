# 🌿 Totoro Photobooth v3

Full-featured Totoro-themed photobooth with a complete user flow, admin panel, strip rendering, 3-second auto video clips, and EmailJS integration.

---

## 📁 Files

```
totoro-photobooth/
├── index.html        ← Main photobooth (user-facing)
├── admin.html        ← Admin panel
├── style.css         ← Shared + photobooth styles
├── admin.css         ← Admin panel styles
├── config.js         ← Shared config store (localStorage)
├── strip-renderer.js ← Canvas strip engine
├── app.js            ← Main photobooth logic
├── admin.js          ← Admin panel logic
├── netlify.toml      ← Netlify deploy config
└── README.md
```

---

## ✨ User Flow (5 Steps)

| Step | Phase | Description |
|------|-------|-------------|
| 1 | Welcome | Choose strip layout (2×4, 1×4, 2×2, 1×3) |
| 2 | Camera Setup | Pick camera source, front/back, live preview |
| 3 | Shoot | Auto session with 3s countdown + 3s video clip per shot |
| 4 | Filter | Apply filters to full strip preview |
| 5 | Finalize | Preview strip, retake individual shots, download |
| 6 | Email | Enter email → send strip via EmailJS |
| 7 | Done | Final strip + download |

---

## 🛠 Admin Panel (`/admin.html`)

- **🖼 Background** — Color, gradient, or image upload for strip background; adjust padding, gap, border radius in real time
- **✏️ Branding** — Brand name, tagline, date toggle, font size, logo upload
- **📧 Email Config** — EmailJS service/template/key setup + test send
- **🎞 Templates** — Save/load full strip configurations
- **📋 Sessions** — View recent booth sessions

---

## 🚀 Deploy to Netlify

### Step 1 — GitHub
1. Create a new repo at [github.com](https://github.com)
2. Upload ALL files (all 9 files including `admin.html`, `admin.css`, etc.)

### Step 2 — Netlify
1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from GitHub**
2. Select your repo
3. Build command: *(leave blank)*
4. Publish directory: `.`
5. Click **Deploy**

---

## 📧 Email Setup (EmailJS — Free)

1. Sign up at [emailjs.com](https://www.emailjs.com) (free plan: 200 emails/month)
2. Create a **Email Service** (Gmail, Outlook, etc.)
3. Create an **Email Template** with these variables:
   ```
   To: {{to_email}}
   Subject: {{subject}}
   Body:
   From: {{from_name}}
   {{message}}
   
   [Strip image attached/linked as {{strip_image}}]
   ```
4. Copy your **Service ID**, **Template ID**, **Public Key**
5. Paste them in the Admin Panel → Email Config → Save

> **Note:** Free EmailJS doesn't support file attachments. The strip image is sent as a base64 data URL embedded in the message. For actual file attachments, upgrade EmailJS or use a backend (Node.js + Nodemailer).

---

## 📱 Mobile Tips

- Allow camera + microphone when prompted
- Works best in Chrome (Android) or Safari (iPhone)
- Front/back camera switching supported
- All 9 files must be uploaded for the app to work correctly
