# create.gashotech.com — Next.js 16 Migration Plan
**Date:** 2026-08-26
**Priority:** Low (do after Photoshop upgrade stabilizes in production)
**Goal:** Migrate from Vite + React SPA to Next.js 16 for SSR, SEO, and performance

---

## Why Migrate?

| Problem | Current State | After Migration |
|---------|--------------|-----------------|
| SEO | Only 1 crawlable page (/) — hash fragments invisible to Google | Every section has its own URL: /chat, /media/image, /media/photoshop, /pricing |
| Page load time | Ships entire app (233KB JS) before showing anything | Route-based code splitting + SSR sends HTML immediately |
| Meta tags | Static in index.html, same for every user | Per-route dynamic meta (open graph, Twitter cards, canonical) |
| LLM discovery | llms.txt provides text-only descriptions | Structured JSON-LD per route, richer LLM crawl data |
| Performance | Blank screen until JS loads | First paint from server-rendered HTML, JS hydrates after |

---

## Migration Phases

### Phase 0: Prerequisites & Setup
**Time estimate: 1-2 hours**

1. Install Next.js 16 alongside existing Vite project (or in a new branch)
   - `npm create next-app@latest` in a fresh branch
   - Copy src/ contents into the Next.js app directory
2. Set up structure:
   ```
   app/
   ├── layout.tsx          — Root layout (theme, fonts, auth context)
   ├── page.tsx            — Root → redirect to /chat
   ├── chat/
   │   └── page.tsx        — ChatInterface (current default view)
   ├── media/
   │   ├── layout.tsx      — Media Studio shell (tabs, sidebar)
   │   ├── image/page.tsx   — Image generation
   │   ├── video/page.tsx   — Video generation
   │   ├── photoshop/page.tsx — Photoshop Corner
   │   └── gallery/page.tsx  — Media gallery
   └── pricing/
       └── page.tsx        — Pricing page
   ```
3. Configure metadata per route via Next.js `generateMetadata`
4. Set up `next.config.ts` with the existing Vite plugins (or replace)

### Phase 1: Port Routing & Layout
**Time estimate: 3-4 hours**

1. Replace React state-based view switching (`currentView`) with Next.js route-based navigation
2. Keep the AppRoutes component as a reference but remove the switch logic
3. Port the root layout (dark theme, font loading, auth context, Supabase session)
4. Port the error boundary pattern
5. Test: all sections load at their respective URLs

### Phase 2: Port Components
**Time estimate: 5-7 hours**

1. Move all components from `components/` to Next.js app structure
2. Identify client components that need `'use client'` (all interactive components)
3. Server components where possible (static content, SEO metadata)
4. Port the routing:
   - `/chat` → ChatInterface
   - `/media` → MediaStudio (with tab-based sub-routing)
   - `/media/image` → Image generation tab
   - `/media/video` → Video generation tab
   - `/media/photoshop` → Photoshop Corner
   - `/media/gallery` → Gallery
   - `/pricing` → Pricing page

### Phase 3: SEO & Metadata
**Time estimate: 1-2 hours**

1. Per-route `generateMetadata` with dynamic OG images
2. Dynamic sitemap generation via `app/sitemap.ts`
3. robots.txt via `app/robots.ts`
4. Move llms.txt to `app/llms.txt/route.ts`
5. Add structured data (JSON-LD) per route
6. Open Graph + Twitter Card images for each section

### Phase 4: Performance & Build
**Time estimate: 2-3 hours**

1. Next.js Image component for all images
2. Route-based code splitting (automatic in Next.js)
3. Incremental Static Regeneration (ISR) for static pages like pricing
4. Lazy loading for heavy components (Photoshop Corner, video generation)
5. Verify build output: Lighthouse scores, bundle size, time-to-interactive

### Phase 5: Testing & Deploy
**Time estimate: 2-3 hours**

1. Verify all features work end-to-end in the new routing
2. Test: chat sessions persist across navigation
3. Test: auth state preserved across routes
4. Test: all 3rd-party integrations (Supabase, Chutes AI, Vercel)
5. Vercel deployment with serverless functions (if needed)
6. Redirect old root URL to /chat
7. Monitor for 24h post-deploy

---

## Key Implementation Details

### Route Structure
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

// app/chat/page.tsx
export const metadata = {
  title: 'Chat — GashoTech Create',
  description: 'AI chat with TEE-secured models: DeepSeek V4, Kimi K3, Qwen 3.8, and more.',
  openGraph: { title: 'Chat — GashoTech Create', ... },
};
export default function ChatPage() { ... }

// app/media/photoshop/page.tsx
export const metadata = {
  title: 'Photoshop Corner — GashoTech Create',
  description: 'Free browser-based image editor with layers, selections, brushes, effects, and export.',
};
```

### Client vs Server Component Strategy
- **Server components** (static): layout, metadata, page shells, pricing
- **Client components** (interactive): ChatInterface, MediaStudio, PhotoshopEditor, image generation, video generation
- Use `'use client'` sparingly — only components that need state, effects, or event handlers

### State Migration
- `currentView` state → Next.js router (`usePathname`, `useRouter`)
- `currentSessionId` → URL search params (`/chat?session=xxx`)
- `activeTab` in MediaStudio → sub-route (`/media/image`, `/media/video`, etc.)
- Auth state → React context (same as current, keep it)

### What Does NOT Change
- All business logic, services, hooks, and types stay the same
- Supabase integration stays the same
- Chutes API integration stays the same
- CSS/tailwind stays the same
- Credit system stays the same

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Users lose session on navigation | Persist session ID in URL params, restore on mount |
| Auth state lost on route change | Keep auth context at root layout level |
| Photoshop state lost on tab switch | Keep photoshop state in a ref/context, not in component state |
| Build fails due to missing modules | Phase 0: install all deps, verify build before moving on |
| Performance regression | Compare Lighthouse scores before/after |

---

## Estimated Total: 15-21 hours (spread across 3-4 days)

## Rollback Plan
- Keep the Vite branch as-is (feature/photoshop-upgrade is the fallback)
- Vercel can instant-rollback any deployment
- No data migration needed — everything is client-side state + API calls
