
/**
 * Blog Image Export Utilities
 * Client-side canvas-based image processing.
 * No backend needed — runs entirely in the browser.
 */

export type BlogImageSize = 'og-card' | 'blog-inline' | 'original-webp';

export const BLOG_IMAGE_PRESETS: Record<BlogImageSize, { width: number; height: number; label: string; desc: string }> = {
  'og-card': { width: 1200, height: 630, label: 'OG Card (1200×630)', desc: 'Social sharing card' },
  'blog-inline': { width: 800, height: 600, label: 'Blog Post (800×600)', desc: 'Inline blog image' },
  'original-webp': { width: 0, height: 0, label: 'Original as WebP', desc: 'Same size, WebP format' },
};

/**
 * Load an image from URL into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Convert an image URL to a WebP blob at the specified blog size.
 */
export async function convertToWebPForBlog(
  imageUrl: string,
  size: BlogImageSize
): Promise<Blob> {
  const img = await loadImage(imageUrl);

  const preset = BLOG_IMAGE_PRESETS[size];
  let targetW: number;
  let targetH: number;

  if (size === 'original-webp') {
    targetW = img.naturalWidth;
    targetH = img.naturalHeight;
  } else {
    targetW = preset.width;
    targetH = preset.height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw scaled image
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Convert to WebP blob (quality 0.85 for OG/blog, 0.92 for original)
  const quality = size === 'original-webp' ? 0.92 : 0.85;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('WebP conversion failed'));
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Convert an image URL to WebP and trigger a download.
 */
export async function downloadAsWebP(
  imageUrl: string,
  size: BlogImageSize,
  baseFilename: string
): Promise<void> {
  const blob = await convertToWebPForBlog(imageUrl, size);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseFilename}-${size}.webp`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get a human-readable file size string from a blob.
 */
export async function getWebPPreviewInfo(
  imageUrl: string,
  size: BlogImageSize
): Promise<{ blobSizeKB: number; dimensions: string }> {
  const blob = await convertToWebPForBlog(imageUrl, size);
  const preset = BLOG_IMAGE_PRESETS[size];
  const dims = size === 'original-webp'
    ? 'original'
    : `${preset.width}×${preset.height}`;
  return {
    blobSizeKB: Math.round(blob.size / 1024),
    dimensions: dims,
  };
}
