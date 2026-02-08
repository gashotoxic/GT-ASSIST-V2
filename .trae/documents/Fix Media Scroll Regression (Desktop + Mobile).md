## What’s Broken (Deep Review)

* The app globally locks page scroll via `overflow-hidden` on the root layout (`App.tsx`) and on `<body>` (`index.html`). That is fine as long as each view (Chat/Media/Pricing) provides its own internal scroll container.

* **Pricing works** because it explicitly uses a full-height `overflow-y-auto` root container: [PricingPage.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/PricingPage.tsx#L109-L112).

* **Chat works** because it has a dedicated internal scroll area inside a full-height flex container: [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L819-L825).

* **Media is currently failing to scroll** (desktop gallery + mobile image generation) because the Media scroll container is not consistently receiving a *constrained height* from its ancestors. When the height constraint breaks, `overflow-y-auto` doesn’t create a scrollable viewport; content gets clipped by the parent’s `overflow-hidden`.

## Files/Areas Involved

* Root scroll locking:

  * [index.html](file:///f:/vibe_coding/GT-ASSIST-V2/index.html#L169-L173)

  * [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx#L505-L540)

* Media layout and intended scroll container:

  * [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L640-L686)

* Working reference patterns:

  * [ChatInterface.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/ChatInterface.tsx#L819-L825)

  * [PricingPage.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/PricingPage.tsx#L109-L112)

## Root Cause (Why It “Got Worse”)

* The current layout relies heavily on `h-full` (percentage heights). In nested flex layouts, `height: 100%` is fragile unless every ancestor has an explicit, resolvable height.

* When one ancestor fails to resolve a percentage height, MediaStudio’s internal `overflow-y-auto` container ends up with “auto” height, so it cannot scroll, and the outer `overflow-hidden` clips the rest (exactly what your screenshots show: gallery stops, and mobile image tab can’t reach the bottom/error UI).

## Fix Strategy (Implement Scroll Like Chat/Pricing)

### 1) Make the view root provide a reliable height using flex sizing (not percentage)

* In [App.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/App.tsx#L505-L540), replace `h-full` usage in the main content wrappers with `flex-1 min-h-0` so the Media view gets a real, constrained height in all browsers (desktop + mobile).

* Keep `overflow-hidden` at the top-level (so only internal panels scroll).

### 2) Ensure MediaStudio uses a single, correct scroll container

* In [MediaStudio.tsx](file:///f:/vibe_coding/GT-ASSIST-V2/components/MediaStudio.tsx#L640-L686):

  * Ensure the MediaStudio root is `flex-1 min-h-0` (not `h-full`).

  * Ensure the content wrapper (currently `flex-1 overflow-y-auto ...`) remains the **only** main scroll area.

  * Avoid nested scroll conflicts (e.g., don’t require scrolling inside the preview unless explicitly intended).

### 3) Fix the specific problem areas you called out

* **Desktop Gallery**: ensure the gallery grid lives inside the main Media scroll container so it can scroll to older items.

* **Mobile Image Generation tab**: ensure the entire image tab (controls + preview) can scroll within MediaStudio’s main scroll container, so you can reach the bottom and see errors.

* **Error visibility**: errors are currently rendered in the left control column; once the main Media scroll works, they will be reachable without zooming out.

### 4) Validate (Regression-proof)

* Verify in desktop:

  * Media → Gallery: scroll to the bottom.

  * Media → Image: generate an error and confirm the error block is scroll-reachable.

* Verify in mobile responsive mode:

  * Media → Image: scroll down past the Generate button and preview.

* Ensure Chat and Pricing scrolling still behaves identically.

## Notes (Watermark Screenshot)

* If you still see “Gashotech” on older images, that can be from previously generated media already saved with watermark; the scroll fix is independent. New generations should reflect current behavior.

