# Disco House Nation — PWA Deployment Guide

## For: Chris Jackson (or whoever manages the web server)
## From: Paul Gordon (DiscoPauli)

---

## What Is This?

This is a Progressive Web App (PWA) for Disco House Nation. It works like a
native app — listeners can add it to their phone's home screen and it opens
full-screen, no browser bar, looks and feels like a real app.

**Features:**
- Live audio streaming (connected to the Citrus3 stream)
- Full DJ roster (18 DJs with bios)
- Weekly schedule
- Mixes section (links to SoundCloud)
- Chat placeholder (ready for future live chat)
- "Add to Home Screen" prompt on mobile
- Works offline (caches schedule and DJ info)
- Works on iPhone, Android, iPad, desktop — everything

---

## Files Included

```
dhn-pwa/
├── index.html          ← The main app (everything in one file)
├── manifest.json       ← PWA config (app name, icon, theme)
├── sw.js              ← Service worker (offline caching)
├── icons/
│   ├── icon.svg       ← Placeholder icon (REPLACE — see below)
│   ├── icon-192.png   ← NEEDS CREATING (see below)
│   └── icon-512.png   ← NEEDS CREATING (see below)
└── DEPLOY.md          ← This file
```

---

## Step 1: Create App Icons

The placeholder SVG is there but you need proper PNG icons with the DHN logo.

**Create two PNG files:**
- `icon-192.png` — 192 x 192 pixels
- `icon-512.png` — 512 x 512 pixels

**Tips:**
- Use the disco ball / DHN neon logo from the website
- Dark background (#040517) with the logo centered
- Square with rounded corners (the OS handles the rounding)
- No transparency
- Save as PNG

**Easy way:** Open the DHN logo in any image editor, resize to 512x512,
export as PNG. Then resize that to 192x192 for the smaller one.

Drop them into the `icons/` folder, replacing the placeholders.

---

## Step 2: Verify the Stream URL

Open `index.html` in a text editor and find this near the top of the script:

```javascript
const STREAM_URL = 'https://hello.citrus3.com:2020/listen/discohousenation/radio.mp3';
const STREAM_FALLBACK = 'https://hello.citrus3.com:2020/public/discohousenation';
```

**Check these are correct!** The primary URL is a guess based on AzuraCast's
standard format. To find the exact URL:

1. Go to https://hello.citrus3.com:2020/public/discohousenation
2. Right-click the play button → "Copy audio address" or check the page source
3. Look for a URL ending in .mp3 or /radio.mp3
4. Update STREAM_URL in index.html if different

If the primary doesn't work, the app automatically falls back to the public page.

---

## Step 3: Upload to the Server

### Option A: Upload to a subdirectory (Recommended)

Upload the entire `dhn-pwa` folder to the web server as `/app/`:

```
your-server/
└── public_html/  (or www/ or htdocs/)
    └── app/
        ├── index.html
        ├── manifest.json
        ├── sw.js
        └── icons/
            ├── icon-192.png
            └── icon-512.png
```

The app will be available at: **https://www.discohousenation.com/app/**

### Option B: WordPress — Upload via File Manager

If the site is on shared hosting (cPanel, Plesk, etc.):

1. Log into your hosting control panel
2. Open **File Manager**
3. Navigate to `public_html` (the web root)
4. Create a new folder called `app`
5. Upload all files into that `app` folder
6. Make sure the folder structure matches what's above

### Option C: WordPress — Upload via FTP

1. Connect via FTP (FileZilla, Cyberduck, etc.)
2. Navigate to the web root
3. Create `/app/` folder
4. Upload all files

---

## Step 4: Add HTTPS Headers (Important for PWA)

The service worker ONLY works over HTTPS. The site already uses HTTPS so this
should be fine. If not, make sure SSL is enabled.

If using Apache, add this to `.htaccess` in the `/app/` folder:

```apache
# Enable CORS for audio streaming
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
</IfModule>

# Correct MIME types
AddType application/manifest+json .json
AddType application/javascript .js
```

If using Nginx, add to the server block:

```nginx
location /app/ {
    add_header Access-Control-Allow-Origin "*";
    try_files $uri $uri/ =404;
}
```

---

## Step 5: Link It From the Main Site

Add a link/button on the DHN homepage so people can find the app. Options:

### Simple link in the menu:
Add a menu item: **"📱 Get The App"** → links to `/app/`

### Or a banner/button on the homepage:
```html
<a href="/app/" style="display:inline-block;padding:12px 24px;
background:linear-gradient(135deg,#0AC9DB,#6EE8F3);color:#000;
border-radius:12px;font-weight:bold;text-decoration:none;font-size:16px;">
📱 Launch DHN App
</a>
```

### Or a WordPress shortcode (if using Elementor/etc):
Just add a button widget pointing to `/app/`

---

## Step 6: Test It

1. Open https://www.discohousenation.com/app/ on your phone
2. The splash screen should appear then fade
3. Tap the big PLAY button — stream should start
4. Check the schedule matches the current day
5. Browse the DJs — tap to expand profiles
6. On iPhone: tap Share → "Add to Home Screen"
7. On Android: you should get an install prompt automatically
8. Open from the home screen icon — should be full screen, no browser bar

---

## Updating Content

### To update the DJ roster or schedule:
1. Open `index.html` in a text editor
2. Find the `allDJs` array (search for it) — edit DJ info there
3. Find the `schedule` object — edit show times there
4. Re-upload the file

### To update the stream URL:
1. Open `index.html`
2. Find `STREAM_URL` near the top of the script
3. Change the URL
4. Re-upload

### After any update:
1. Change the version number in `sw.js` (line 1: `const CACHE_NAME = 'dhn-v2'`)
2. This forces the service worker to refresh cached content

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Stream won't play | Check STREAM_URL is correct. Try the fallback URL directly in a browser |
| No "Add to Home Screen" prompt | Make sure you're on HTTPS and manifest.json is loading (check DevTools → Application → Manifest) |
| Old content showing | Update CACHE_NAME version in sw.js and re-upload |
| Icons not showing | Check icon-192.png and icon-512.png exist and are valid PNGs |
| Blank page | Check browser console for JavaScript errors (usually a typo in edited content) |

---

## Future Enhancements

When you're ready for the next phase:
- **Live chat:** Add Firebase for real-time messaging
- **Push notifications:** "Your DJ is live!" alerts
- **Auto-updating schedule:** Pull from a Google Sheet or Firebase instead of hardcoded
- **SoundCloud embeds:** Embed mix players directly in the app
- **Song requests:** Let listeners request tracks during shows

---

**Questions? Contact Paul (DiscoPauli)**
