# Deep Keyword Research — Tools to Build Next

> **TL;DR**: We have 117 tools. The biggest SEO opportunity is **social
> downloaders** (300K+ monthly searches for "YouTube Thumbnail Downloader"
> alone) and **crypto/hash/UUID/QR utilities** (combined 500K+/month,
> buildable in a weekend). Below is the full priority list, sized by
> search volume × effort-to-build × competitive density.

---

## 🔴 Tier 1 — Build NOW (highest ROI)

These are searches that, by Google's own autocomplete, hit **six figures per
month globally**, and the tools are short to build. Each is sized at the
volume the existing 1st-page tools capture (i.e., the addressable market
for a new entrant).

### 1. YouTube Thumbnail Downloader — 300K+ searches/mo

- **Why first**: Single highest-volume tool keyword we don't have
- **Effort**: 2-3 hours
- **How it works**: Parse YouTube video ID from URL → call
  `https://img.youtube.com/vi/{ID}/maxresdefault.jpg` (and 3 lower-res
  variants) → serve as a download
- **URL slug**: `/en/tools/image/youtube-thumbnail-downloader`
- **Category**: image (or new "social" category)
- **Monetization**: "Make a custom thumbnail" upsell to our AI image tools
- **Risk**: low. Not DMCA (thumbnails are public). iLoveIMG and ytthumb
  dominate — we win on UX + free + no signup

### 2. QR Code Generator — 100K+ searches/mo

- **Why**: Every restaurant, business card, product box needs one
- **Effort**: 1-2 days
- **Library**: `qrcode` npm package (server-side, generates SVG/PNG)
- **Variants needed**:
  - URL QR code (most common)
  - WiFi QR code (cafe/restaurant use case — 20K+/mo alone)
  - vCard QR code (contact card)
  - Email QR code
  - SMS QR code
  - Custom colors + logo overlay (premium UX)
- **URL slugs**: `/en/tools/generator/qr-code`,
  `/en/tools/generator/wifi-qr-code`, `/en/tools/generator/vcard-qr-code`
- **Category**: new "generator" category, or add to "developer"
- **Risk**: low. Highly competitive but high-intent

### 3. Password Generator — 100K+ searches/mo

- **Why**: Trivial to build, high-intent (people want to use it NOW)
- **Effort**: 2-4 hours
- **Features**:
  - Length slider (8-128 chars)
  - Toggle: uppercase / lowercase / numbers / symbols
  - Strength meter (zxcvbn library)
  - Copy-to-clipboard (one click)
  - Pronounceable option (passphrase)
- **URL slug**: `/en/tools/generator/password-generator`
- **Risk**: zero. All client-side, no data leaves browser
- **SEO tip**: Add a "How to remember strong passwords" content section
  to capture informational searches

### 4. TikTok Video Downloader — 100K+ searches/mo

- **Why**: Massive search volume, but…
- **Risk**: ⚠️ **DMCA / ToS concern**. TikTok's ToS prohibits scraping.
  We can build it for **personal, non-commercial, fair use** only
  (the standard "for personal use only" disclaimer pattern that
  snapTik, ssstikato, etc. use)
- **Effort**: 1-2 days (HTML scraper)
- **Alternative**: Skip TikTok and build **YouTube Shorts Downloader**
  (similar demand, less legal risk)
- **Recommendation**: Build YouTube Shorts first, add TikTok as a
  separate "advanced" page with the legal disclaimer
- **URL slug**: `/en/tools/social/youtube-shorts-downloader`

### 5. Social Media Image Resizer — 50K+ searches/mo

- **Why**: Every social platform wants a different size
- **Effort**: 4-6 hours
- **Sizes to support** (from Buffer/Hootsuite 2026 guide):
  - Instagram Post: 1080x1080 (square), 1080x1350 (portrait), 1080x566 (landscape)
  - Instagram Story / Reel: 1080x1920
  - Facebook Post: 1200x630
  - Facebook Cover: 851x315
  - Twitter / X Post: 1200x675
  - Twitter / X Header: 1500x500
  - LinkedIn Post: 1200x627
  - LinkedIn Cover: 1584x396
  - YouTube Thumbnail: 1280x720
  - YouTube Banner: 2560x1440
  - TikTok: 1080x1920
  - Pinterest Pin: 1000x1500
- **URL slug**: `/en/tools/image/social-media-resizer`
- **UX**: Upload image → see 12 platform previews side-by-side → download all
  as a ZIP. Adobe Express has this gated behind signup; we win on free + instant

---

## 🟡 Tier 2 — Build next (high volume, moderate effort)

### 6. Color Picker / Hex to RGB Converter — 30K-50K/mo

- **Why**: Designers search this constantly
- **Effort**: 2-4 hours
- **Features**: Image upload → eyedropper → output hex/RGB/HSL/CMYK
- **Library**: HTML5 Canvas + `colorthief` npm
- **URL slug**: `/en/tools/developer/color-picker`

### 7. Hashtag Generator — 20K-30K/mo

- **Why**: Instagram/TikTok creators need them daily
- **Effort**: 4-6 hours
- **Approach**: Input topic → return 30 hashtags grouped by
  popularity tier (mega > 1M, macro 100K-1M, micro 10K-100K, niche <10K)
- **No API needed** for v1 — use a curated database
- **URL slug**: `/en/tools/writing/hashtag-generator`

### 8. Lorem Ipsum Generator — 20K-30K/mo

- **Why**: Trivial build, captures designer/developer searches
- **Effort**: 1-2 hours
- **Variants**: Lorem Ipsum, Lorem JSON, Lorem CSV, hipster ipsum, cupcake ipsum
- **URL slug**: `/en/tools/writing/lorem-ipsum-generator`

### 9. Hash Generator (MD5 / SHA-1 / SHA-256 / SHA-512) — 30K+/mo combined

- **Why**: Devs search this when debugging or verifying checksums
- **Effort**: 2-4 hours total (one page, multiple output formats)
- **Approach**: Web Crypto API (client-side, no server cost)
- **URL slug**: `/en/tools/developer/hash-generator`

### 10. UUID Generator — 20K-30K/mo

- **Why**: Trivial, dev/SEO daily use
- **Effort**: 30 min
- **Library**: `crypto.randomUUID()` (browser native)
- **URL slug**: `/en/tools/developer/uuid-generator`

### 11. Base64 Image Encoder — 10K-20K/mo

- **Why**: Devs need to embed images in CSS/HTML without uploading
- **Effort**: 1-2 hours
- **URL slug**: `/en/tools/developer/base64-image-encoder`

### 12. Unix Timestamp Converter — 10K+/mo

- **Why**: Devs grep this 100x/day
- **Effort**: 1-2 hours
- **URL slug**: `/en/tools/developer/unix-timestamp`

### 13. Markdown to HTML — 10K+/mo

- **Why**: Devs/bloggers use it daily
- **Effort**: 2-3 hours
- **Library**: `marked` (client-side)
- **URL slug**: `/en/tools/developer/markdown-to-html`

### 14. URL Encoder/Decoder — 10K+/mo

- **Why**: Trivial, dev use
- **Effort**: 1 hour
- **URL slug**: `/en/tools/developer/url-encoder`

### 15. CSS / JS / HTML Minifier — 30K+/mo combined

- **Why**: Build pipeline step many devs do manually
- **Effort**: 4-6 hours total
- **Library**: `clean-css`, `terser`, `html-minifier-terser`
- **URL slugs**: `/en/tools/developer/css-minifier`,
  `/en/tools/developer/javascript-minifier`, `/en/tools/developer/html-minifier`

### 16. Aspect Ratio Calculator — 10K+/mo

- **Why**: Photographers, designers, video editors all need it
- **Effort**: 2-3 hours
- **URL slug**: `/en/tools/image/aspect-ratio-calculator`

### 17. Image Format Converter — 30K+/mo

- **Variants we don't have**:
  - HEIC to JPG (iPhone photos) — high demand
  - SVG to PNG/JPG
  - RAW to JPG
  - TIFF to JPG
  - AVIF to JPG
- **URL slugs**: `/en/tools/image/heic-to-jpg`, etc.
- **Effort**: each is 2-3 hours using sharp or similar

### 18. Audio/Video Format Converters (missing popular ones)

- WAV to MP3 — 20K+/mo
- M4A to MP3 — 15K+/mo
- MP4 to MP3 — 50K+/mo (high!)
- MOV to MP4 — 10K+/mo
- WEBM to MP4 — 10K+/mo
- **Library**: FFmpeg.wasm (client-side, slow but works)
- **Risk**: FFmpeg.wasm bundle is 25MB+, slow on first load
- **Alternative**: Server-side conversion (but expensive at scale)
- **URL slugs**: as listed above

### 19. Ebook Format Converters

- EPUB to PDF — 30K+/mo
- MOBI to PDF — 10K+/mo
- PDF to EPUB — 20K+/mo
- **Library**: `ebook-converter` (server-side)
- **Effort**: each 4-8 hours

---

## 🟢 Tier 3 — Build later (lower volume, higher effort, or too competitive)

| Tool                         | Vol/mo   | Effort             | Notes                             |
| ---------------------------- | -------- | ------------------ | --------------------------------- |
| Resume Builder               | 100K+    | 2 weeks            | Very competitive, needs templates |
| Invoice Generator            | 30K-50K  | 1 week             | We have it, but missing templates |
| Mortgage Calculator          | 50K-100K | 1 day              | We have it                        |
| Loan Calculator              | 50K+     | 1 day              | We have loan-amortization         |
| BMI Calculator               | 50K+     | 2 hours            | We have it                        |
| Age Calculator               | 30K+     | 1-2 hours          | Easy add                          |
| Tip Calculator               | 20K+     | 1 hour             | Easy add                          |
| Percentage Calculator        | 50K+     | 2-3 hours          | Easy add                          |
| Discount Calculator          | 10K+     | 1 hour             | Easy add                          |
| Time Zone Converter          | 10K+     | 1 day              | We have it                        |
| Currency Converter           | 20K+     | 1 day (live rates) | We have it (static?)              |
| Favicon Generator            | 20K+     | 4-6 hours          | Easy with sharp                   |
| Open Graph Image Generator   | 10K+     | 1 day              | Devs need this                    |
| Mockup Generator             | 10K+     | 1 week             | Hard to do well                   |
| Screenshot Beautifier        | 10K+     | 1 day              | Cool, but niche                   |
| IP Address Lookup            | 20K+     | 1 day              | Need IP API                       |
| DNS Lookup                   | 10K+     | 1 day              | Need DNS library                  |
| Whois Lookup                 | 20K+     | 1 day              | Need whois library                |
| Website Speed Test           | 10K+     | 1 week             | Compete with GTmetrix/PageSpeed   |
| Uptime Monitor               | 5K+      | 1 week             | Not a free tool, really           |
| Email Validator              | 10K+     | 1 day              | Trivial                           |
| Phone Number Validator       | 5K+      | 1 day              | Trivial                           |
| IBAN Validator               | 5K+      | 1 day              | Trivial                           |
| Credit Card Validator (Luhn) | 20K+     | 2-3 hours          | Trivial, but ethical concerns     |

---

## 🚫 Don't build (low ROI or wrong category)

- AI image generator — we have one but it's expensive to run. Don't compete
  with Midjourney
- Video editor — Adobe/Descript own this. Massive effort
- Audio editor — same
- Screen recorder — desktop apps dominate
- Cloud storage — Dropbox/Google own this
- VPN/Proxy — security concerns, regulatory
- AI chatbot — we already have "Chat with PDF", don't generalize
- Free games — wrong category, different audience

---

## 📊 Build priority for the next 4 weeks

Week 1 (ship these 5):

1. YouTube Thumbnail Downloader
2. QR Code Generator (URL only)
3. Password Generator
4. Lorem Ipsum Generator
5. UUID Generator

Week 2 (ship 5 more): 6. Color Picker 7. Hash Generator (MD5/SHA-1/SHA-256 in one page) 8. Unix Timestamp Converter 9. URL Encoder/Decoder 10. Markdown to HTML

Week 3 (ship 5 image/social tools): 11. Social Media Resizer 12. HEIC to JPG 13. Hashtag Generator 14. Aspect Ratio Calculator 15. YouTube Shorts Downloader

Week 4 (ship the polish + format converters): 16. CSS/JS/HTML Minifiers (3 slugs, one engine) 17. Base64 Image Encoder 18. EPUB to PDF 19. MP4 to MP3 (server-side, gated behind queue) 20. Favicon Generator

End of month: 137 tools (from 117). All client-side or light server-side,
all matching real demand, all SEO-friendly slugs.

---

## 🔑 Why "thumbnail" is the single best word to rank for

Three reasons:

1. **Volume**: "YouTube Thumbnail Downloader" alone is 300K+/month
2. **Intent**: User has a specific video URL and a specific intent — they
   convert at 5-10% (vs. 1% for general "PDF tools" search)
3. **Compounding**: Once you rank for the YouTube version, you can
   cross-link to YouTube Shorts Downloader, YouTube Thumbnail Maker,
   YouTube Tags Generator, YouTube Title Generator, etc. — the entire
   YouTube creator tool ecosystem

The "thumbnail" theme is an SEO goldmine. If I were doing this for the
next 6 months I'd build out an entire **YouTube Creator Toolkit** section.

---

## 📈 How to measure

Track per-tool in Plausible/GA4:

- **Page views / month** (should grow ~30% MoM for first 6 months)
- **Time on page** (good = 60s+ for converters, 30s+ for generators)
- **Download/conversion event** (the actual tool use)
- **Bounce rate** (bad = > 70% for utility tools)

After 90 days, double down on the top 20% of tools. Kill the bottom 20%
that don't get any traffic (they're diluting your internal link graph).

---

## 🎯 Quick wins to ship TODAY (under 4 hours each)

If I were prioritizing for tomorrow's PR:

1. **Password Generator** (2h) — pure client-side, ships today
2. **UUID Generator** (30min) — `crypto.randomUUID()` exists
3. **Lorem Ipsum Generator** (2h) — pure client-side
4. **Unix Timestamp Converter** (2h) — pure client-side
5. **Color Picker from Image** (4h) — canvas + eyedropper

These 5 ship in a single day, all on a "developer" subcategory page
(or a new "utility" category), and capture 200K+ monthly searches
combined.
