# create.gashotech.com — Site Map & LLM Discovery Plan
**Date:** 2026-08-17
**Branch:** feature/sitemap-and-seo (new, off main)
**Goal:** Make all sections of the app discoverable by search engines, crawlers, and LLM agents

---

## Current State

The app is a **Vite + React SPA** with no URL-based routing (state-driven view switching).

**App entry points (state-driven):**
| View ID | State name | Description |
|---------|-----------|-------------|
| chat | currentView='chat' | Main AI chat interface |
| media | currentView='media' | Media Studio (image, editor, video, PS, gallery) |
| pricing | currentView='pricing' | Pricing & credits page |

**Media Studio tabs (when inside media view):**
| Tab | ID | Description |
|-----|----|-------------|
| Image Generation | image | Text-to-image + image-to-image |
| Image Editor | edit | In-browser image editor (pre-AI filters) |
| Video Animator | video | Text-to-video + image-to-video |
| Photoshop Corner | photoshop | Full browser-based image editor (all 5 phases) |
| Gallery | gallery | User's generated media history |

**Current SEO situation:**
- No sitemap.xml, no robots.txt, no llms.txt
- Title is just "GT Assistant" (generic, not branded)
- No meta description
- No canonical URL
- No structured data / JSON-LD

---

## What to Create

### 1. `public/sitemap.xml` — Standard XML Sitemap
• Lists the main app entry point and anchor-based sub-sections
• Lastmod date, changefreq, priority for each
• Since this is an SPA without URL routing, use the root URL with descriptive anchors
• Add a `<urlset>` block for each major section

### 2. `public/robots.txt` — Crawler Instructions
• Allow all search engine bots (we want indexing)
• Point to the sitemap
• Disallow any future admin/auth routes if they exist

### 3. `public/llms.txt` — LLM Discovery File
An emerging standard (llmstxt.org) — a plaintext file that LLM crawlers fetch to understand the entire site. It should contain:
- A title + description of create.gashotech.com
- A list of sections with brief descriptions
- Any API endpoints or resources that LLM agents can use
- Structured sections so an LLM can understand the app's capabilities

### 4. Meta Tag Updates — `index.html`  
• Change `<title>` to "GashoTech Create — AI Studio"
• Add `<meta name="description">` describing the platform
• Add `<meta name="keywords">` for SEO
• Add `<link rel="canonical" href="https://create.gashotech.com/">`

### 5. JSON-LD Structured Data
Embed a `<script type="application/ld+json">` block in index.html with:
- @type: WebApplication
- Name: GashoTech Create
- URL: create.gashotech.com
- Description: AI-powered creative studio
- Application category: Multimedia
- Offers: Freemium with credit system

---

## Files to Modify/Create
```
public/
├── sitemap.xml     (NEW)  — XML sitemap for search engines
├── robots.txt      (NEW)  — Crawler instructions
├── llms.txt        (NEW)  — LLM discovery file
index.html          (MODIFY) — Title, meta, JSON-LD, canonical
```

## Technical Approach
- These are **static files**: no dependencies, no build plugins
- Place them in `public/` so Vite copies them verbatim to `dist/` on build
- No npm packages needed — pure XML/TXT/HTML
- llms.txt must be valid UTF-8, plain text, max ~200 lines

## Verification
1. Files exist in `public/`
2. `npm run build` completes — files appear in `dist/`
3. `npx tsc --noEmit` passes (index.html changes don't affect TS)
4. curl localhost preview to confirm files are served at `/sitemap.xml`, `/robots.txt`, `/llms.txt`
5. Commit + push to new branch

## After Merge
- Crawlers will find sitemap.xml via robots.txt
- LLM agents (Claude, ChatGPT, Perplexity) will find llms.txt to understand the app
- Updated meta tags improve search result snippets
