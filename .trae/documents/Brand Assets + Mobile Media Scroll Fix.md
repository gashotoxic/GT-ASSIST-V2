## What’s happening (why Media scroll breaks on mobile)
- In MediaStudio, there’s already a main scroll container for the whole tab: [MediaStudio.tsx:L828](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L828) (`flex-1 overflow-y-auto ...`).
- Inside that, the preview pane (`#tour-media-content`) is also a scroll container: [MediaStudio.tsx:L1225-L1227](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L1225-L1227).
- On mobile browsers (especially iOS Safari), nested scroll regions often fail unless the inner region has:
  - A real height constraint (not just `flex-1`), and
  - `-webkit-overflow-scrolling: touch` to allow touch scrolling.
- On desktop, scroll works because mousewheel/scrollbars handle nested overflow better.

## Plan

## 1) Extract your `myfavicon.zip` and install brand assets
Files involved: `public/` (new), [index.html](file:///f:/vibe_coding/GT-ASSIST-V2/index.html), [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx)
1. Create a `public/` folder (Vite default) and a `public/brand/` subfolder.
2. Extract `f:\vibe_coding\GT-ASSIST-V2\myfavicon.zip` into a temporary folder.
3. From the extracted assets, select:
   - A primary mark/logo for in-app header (prefer SVG, else high-res PNG).
   - Favicon set (prefer `.ico` multi-size + 32x32 PNG + 180x180 apple-touch-icon PNG). If the zip doesn’t include these exact sizes, I’ll generate the needed resized PNGs from the best source image.
4. Copy only the chosen files into `public/`:
   - `public/favicon.ico`
   - `public/favicon-32x32.png` (if available)
   - `public/apple-touch-icon.png`
   - `public/brand/logo.(svg|png)` and optionally `public/brand/mark.(svg|png)`
5. Update [index.html](file:///f:/vibe_coding/GT-ASSIST-V2/index.html) head:
   - Add favicon + apple-touch-icon link tags.
   - Update the `<title>` to your brand name (or keep “GT Assistant” if you prefer).
6. Update the in-app header “logo block” in [App.tsx:L387-L395](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx#L387-L395):
   - Replace the `Bot` icon with your brand mark image.
7. Cleanup:
   - Delete the temporary extracted folder.
   - Delete `myfavicon.zip`.
   - Delete any extracted files that aren’t used.

## 2) Fix Media preview scrolling on mobile (without affecting desktop)
Files involved: [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx)
1. Keep current desktop behavior (already OK).
2. Make `#tour-media-content` reliably scrollable on touch devices:
   - Add a mobile-only height constraint (e.g. `h-[55dvh]` on mobile, `sm:h-auto` on larger screens).
   - Add `style={{ WebkitOverflowScrolling: 'touch' }}` to enable touch scrolling.
   - Add `touch-pan-y` (Tailwind) so swipes on the image scroll the container instead of feeling “stuck”.
3. Remove the conflicting `min-h-[400px] min-h-0` pairing on the preview area/column and replace it with intentional breakpoint rules (e.g. `min-h-[55dvh] sm:min-h-[400px]`), so mobile gets a constrained viewport where overflow can actually happen.

## 3) Verification
1. Quick local checks:
   - Media tab on mobile widths (≤640px): tall images scroll inside the preview area.
   - Desktop: preview still behaves as before.
2. Run:
   - `npm run lint`
   - `npm run build`

If you approve, I’ll implement these changes and ensure only the necessary brand files remain in the repo.