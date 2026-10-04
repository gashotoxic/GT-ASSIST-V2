# DOX -- components/media

**Media Studio -- image, video, and animation generation**

## Purpose

Media generation interface where users create and edit images, videos, and animations using AI.

## Ownership

- hooks/ -- Media-specific hooks (useMediaHandlers)

## Local Contracts

- Main component: MediaStudio.tsx (tabs: Generate, Edit, Animate)
- Image generation via Chutes API (vonkaiser-z-image-turbo)
- Credit deduction per generation via deducCredits
- Photoshop editor embedded as a tab within MediaStudio
- Video generation retry hints surface through genStatus.video.status ("retrying n/3") in the existing progress row
