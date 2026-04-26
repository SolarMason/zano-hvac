# ZANO HVAC/R & Plumbing — iOS Native PWA

Full clone of [zanohvac.com](https://www.zanohvac.com/), rebuilt as a Progressive Web App with iOS-native styling, glassmorphism, full offline support, and zero external dependencies on the original site (logo and photos still load from the original CDN — `cdn.lindoai.com`).

---

## What's inside

```
zano-pwa/
├── index.html               Home
├── services.html            Services (HVAC, Refrigeration, Plumbing, Maintenance)
├── articles.html            Articles index
├── about.html               About / Mission / Vision
├── contact.html             Contact form + map + tap-to-call cards
├── account.html             Login / Create Account / Schedule Service  (replaces external app.zanohvac.com)
├── privacy-policy.html      Privacy Policy
├── cookie.html              Cookie Policy
├── offline.html             Shown when device is offline
├── 404.html                 Not-found page
├── blog/
│   ├── maintenance-tips.html    (replaces /blog/keyword_1)
│   └── comfortable-home.html    (replaces /blog/keyword_2)
├── assets/
│   ├── styles.css           Full iOS-glass design system, light + dark mode
│   ├── app.js               PWA hooks: install prompt, share, offline queue, toasts
│   ├── og-image.png         1200×630 share card
│   └── icons/               12 PWA icon sizes + 6 Apple splash screens + favicons
├── manifest.json            Full PWA manifest with shortcuts, share_target, screenshots
└── sw.js                    Offline-first service worker (network-first HTML, cache-first images, stale-while-revalidate assets)
```

---

## PWA features

- **Installable** on iOS (Add to Home Screen) and Android/desktop (`beforeinstallprompt`).
- **Offline-first**: Shell pre-cached on install; cached pages still load when offline; `/offline.html` fallback for uncached navigation.
- **App Shortcuts** (long-press the icon on supported OSes): Schedule Service, Call Now, Browse Services.
- **Share Target**: registered as a share destination — receives shared text/links into `/contact.html`.
- **Web Share API**: every page has a working `Share` button (native sheet on mobile, clipboard fallback elsewhere).
- **Push notification hook** (handler ready in `sw.js`; needs a backend to send).
- **Background sync hook** for form submissions when back online.
- **Apple Splash Screens** for major iPhone sizes (XR, 8, 12 Pro Max, 13, 14/15, 15 Pro Max).
- **Maskable icons** for Android adaptive shapes.

---

## Branding preserved

- **Logo**: `https://cdn.lindoai.com/c/recInpZIbTFpj1CP4/images/logo-full-256x.png` (loaded from original CDN)
- **All 22+ photos**: GIFs and stills from `cdn.lindoai.com`, `media4.giphy.com`, `media0.giphy.com`, `media.tenor.com` (preconnect hints in `<head>` for fast loading)
- **Address**: 124 E Front Street, Hancock NY 13783
- **Phone**: 607-232-1563 (clickable `tel:`)
- **Email**: support@zanohvac.com (clickable `mailto:`)
- **Maps link**: opens Google Maps in a new tab

---

## Internal page replacements (no links back to original site)

| Original | Replaced with |
|---|---|
| `app.zanohvac.com` (login) | `account.html#login` |
| `app.zanohvac.com/account` (signup) | `account.html#create` |
| Schedule Service buttons | `account.html?intent=schedule` |
| `/blog/keyword_1` | `/blog/maintenance-tips.html` |
| `/blog/keyword_2` | `/blog/comfortable-home.html` |
| Footer "Services" typo (linked to `/articles`) | Fixed to `/services.html` |

---

## Forms (client-side, queue-tolerant)

Every form (`contact`, `login`, `create-account`, `schedule`) submits client-side, queues the payload to `localStorage`, and shows a success state. To wire to a backend later, replace the `data-zano-form` handler in `assets/app.js` with a `fetch()` POST to your endpoint (the queue is already there to replay on reconnect).

---

## Deploying

The PWA needs to be served from a domain root (HTTPS) for the service worker scope `/` and the `start_url` `/?source=pwa` to work.

### Option 1 — GitHub Pages (matches your Solar Mason workflow)

```bash
# Inside the unzipped zano-pwa folder
git init
git add .
git commit -m "Initial ZANO PWA"
git branch -M main
git remote add origin https://github.com/<YOUR-ORG>/zano-pwa.git
git push -u origin main
```

Then in repo Settings → Pages → set source to **GitHub Actions** (or Deploy from branch → `main` / `/`).

If publishing to `username.github.io/zano-pwa/` (a sub-path), update three things:
- `manifest.json`: change `start_url` and `scope` to `/zano-pwa/`
- `sw.js`: change SW registration in `app.js` to `/zano-pwa/sw.js` and update CORE_ASSETS paths
- All `<link href="/...">` and `<a href="/...">` paths in HTML

### Option 2 — Custom domain (recommended)

Drop the `zano-pwa/` contents at the root of your hosting (Netlify drag-and-drop, Vercel, Cloudflare Pages, S3 + CloudFront, etc.). Everything is already root-relative, so it just works.

### Option 3 — Local test

```bash
cd zano-pwa
python3 -m http.server 8000
# Open http://localhost:8000/
# Note: SW won't activate without HTTPS, but the rest works
```

---

## Brand & design tokens

Edit `assets/styles.css` `:root` block to retheme:

| Token | Value | Used for |
|---|---|---|
| `--brand-blue` | `#0A84FF` | iOS system blue, primary CTAs |
| `--brand-navy` | `#0A2540` | Deep brand color, hero gradients, theme color |
| `--brand-amber` | `#FF9F0A` | Heating accent, schedule CTAs |
| `--brand-red` | `#FF3B30` | Emergency / alert |
| `--brand-green` | `#34C759` | Success, online indicator |

Light + dark modes are auto-handled via `prefers-color-scheme`.

---

## Lighthouse expectations

After deployed to HTTPS:
- **Performance**: 95+ (CDN images are external; consider self-hosting for 100)
- **Accessibility**: 95+ (semantic HTML, alt text, ARIA)
- **Best Practices**: 100
- **SEO**: 100
- **PWA**: passes installability checks

---

## Built by Claude for Noel Segui · April 2026
