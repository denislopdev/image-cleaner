# Image Cleaner & Re-Encoder

**Live app:** [https://denislopdev.github.io/image-cleaner/](https://denislopdev.github.io/image-cleaner/)

Clean, resize, convert, and re-encode images **entirely in your browser**. Creates a fresh image file without carrying over standard EXIF / IPTC / XMP metadata. Nothing is uploaded to a server.

---

## Try it

[![Open Image Cleaner](https://img.shields.io/badge/Open-Image%20Cleaner-0b6e6e?style=for-the-badge&logo=github)](https://denislopdev.github.io/image-cleaner/)

Or open: **https://denislopdev.github.io/image-cleaner/**

---

## What it does

| Feature | Details |
|--------|---------|
| Formats | JPG, PNG, WEBP |
| Pipeline | Decode → canvas redraw → encode (`toBlob`) |
| Options | Output format, quality (70–100%), resize %, max width |
| Privacy | 100% client-side — images never leave your device |
| Output | New filename like `image-20260915-a8f32.jpg` |

### What it does **not** do

- Does not claim to remove AI labels, C2PA, Content Credentials, or social-network detection
- Does not upload files, require accounts, or use API keys
- Does not add filters, color grading, or watermarks

---

## How to use

1. Drop or upload an image (max 25 MB, side ≤ 8192 px)
2. Choose format / quality / resize / max width
3. Click **Process Image**
4. Preview, compare Before/After, then **Download**

---

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

---

## Stack

Vanilla **HTML · CSS · JavaScript** — no build step, no backend.

Hosted with **GitHub Pages** from the `main` branch.
