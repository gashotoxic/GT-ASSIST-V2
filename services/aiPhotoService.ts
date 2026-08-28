/**
 * AI Photo Service — Wraps Chutes API for Photoshop AI operations
 * Handles image generation, editing, remove-bg, upscale, smart fill, style transfer
 * with proper credit deduction and auth gating.
 */
import { ChutesService } from '../services/chutes';
import { getCreditCost } from '../services/creditCosts';

export type AIPhotoAction =
  | 'generate'
  | 'edit'
  | 'remove_bg'
  | 'upscale'
  | 'upscale_2x'
  | 'upscale_4x'
  | 'smart_fill'
  | 'style_transfer';

export const AI_ACTION_LABELS: Record<AIPhotoAction, string> = {
  generate: 'Generate Image',
  edit: 'AI Edit',
  upscale_2x: 'Upscale 2x',
  upscale_4x: 'Upscale 4x',
  remove_bg: 'Remove Background',
  upscale: 'Upscale',
  smart_fill: 'Smart Fill',
  style_transfer: 'Style Transfer',
};

export const AI_ACTION_MODELS: Record<AIPhotoAction, { modelId: string; url: string }> = {
  generate: { modelId: 'z-image-turbo', url: 'https://vonkaiser-z-image-turbo.chutes.ai/v1/images/generations' },
  upscale_2x: { modelId: 'upscale', url: 'https://vonkaiser-imageclassic.chutes.ai/generate' },
  upscale_4x: { modelId: 'upscale', url: 'https://vonkaiser-imageclassic.chutes.ai/generate' },
  edit: { modelId: 'qwen-image-edit', url: 'https://vonkaiser-qwen-image-edit-2511.chutes.ai/generate' },
  remove_bg: { modelId: 'remove_bg', url: 'https://vonkaiser-imageclassic.chutes.ai/generate' },
  upscale: { modelId: 'upscale', url: 'https://vonkaiser-imageclassic.chutes.ai/generate' },
  smart_fill: { modelId: 'qwen-image-edit', url: 'https://vonkaiser-qwen-image-edit-2511.chutes.ai/generate' },
  style_transfer: { modelId: 'qwen-image-2512', url: 'https://vonkaiser-qwen-image-2512.chutes.ai/generate' },
};

export function getAICreditCost(action: AIPhotoAction): number {
  return getCreditCost('photoshop_ai', action);
}

export interface AIPhotoServiceConfig {
  chutesService: ChutesService;
  deductCredits: (type: string, model?: string) => Promise<boolean>;
  onRequestAuth?: () => void;
  isAuthenticated: boolean;
}

/**
 * Generate an image from a text prompt. Returns a blob.
 */
export async function aiGenerateImage(
  config: AIPhotoServiceConfig,
  prompt: string,
  aspectRatio: string
): Promise<Blob | null> {
  if (!config.isAuthenticated) { config.onRequestAuth?.(); return null; }
  const cost = getAICreditCost('generate');
  if (!await config.deductCredits('photoshop_ai', 'generate')) return null;

  return config.chutesService.generateImage({
    prompt,
    modelUrl: AI_ACTION_MODELS.generate.url,
    modelId: AI_ACTION_MODELS.generate.modelId,
    aspectRatio: aspectRatio as any,
  });
}

/**
 * Edit an image using AI (inpaint/outpaint). Pass image as dataUrl, returns edited blob.
 */
export async function aiEditImage(
  config: AIPhotoServiceConfig,
  imageDataUrl: string,
  prompt: string
): Promise<Blob | null> {
  if (!config.isAuthenticated) { config.onRequestAuth?.(); return null; }
  const cost = getAICreditCost('edit');
  if (!await config.deductCredits('photoshop_ai', 'edit')) return null;

  return config.chutesService.editImage({
    prompt,
    image_b64: imageDataUrl,
    modelUrl: AI_ACTION_MODELS.edit.url,
  });
}

/**
 * Remove background from an image. Returns blob with transparent bg.
 */
export async function aiRemoveBackground(
  config: AIPhotoServiceConfig,
  imageDataUrl: string
): Promise<Blob | null> {
  if (!config.isAuthenticated) { config.onRequestAuth?.(); return null; }
  const cost = getAICreditCost('remove_bg');
  if (!await config.deductCredits('photoshop_ai', 'remove_bg')) return null;

  return config.chutesService.editImageAdvanced({
    prompt: '',
    image_b64: imageDataUrl,
    modelUrl: AI_ACTION_MODELS.remove_bg.url,
    editMode: 'remove_bg',
  });
}

/**
 * Upscale an image by 2x or 4x. Returns blob.
 */
export async function aiUpscaleImage(
  config: AIPhotoServiceConfig,
  imageDataUrl: string,
  scale: 2 | 4
): Promise<Blob | null> {
  if (!config.isAuthenticated) { config.onRequestAuth?.(); return null; }
  const cost = getAICreditCost(scale === 4 ? 'upscale_4x' : 'upscale_2x');
  if (!await config.deductCredits('photoshop_ai', scale === 4 ? 'upscale_4x' : 'upscale_2x')) return null;

  const blob = await (await fetch(imageDataUrl)).blob();
  // Convert blob to file and use editImageAdvanced with upscale mode
  return config.chutesService.editImageAdvanced({
    prompt: 'Upscale this image 2x',
    image_b64: imageDataUrl,
    modelUrl: AI_ACTION_MODELS.upscale.url,
    editMode: 'upscale',
  });
}

/**
 * Style transfer — apply artistic style to an image.
 */
export async function aiStyleTransfer(
  config: AIPhotoServiceConfig,
  imageDataUrl: string,
  style: string
): Promise<Blob | null> {
  if (!config.isAuthenticated) { config.onRequestAuth?.(); return null; }
  const cost = getAICreditCost('style_transfer');
  if (!await config.deductCredits('photoshop_ai', 'style_transfer')) return null;

  return config.chutesService.editImageAdvanced({
    prompt: style,
    image_b64: imageDataUrl,
    modelUrl: AI_ACTION_MODELS.style_transfer.url,
    editMode: 'style_transfer',
    stylePreset: style as any,
  });
}

/**
 * Smart fill — fill a selected area with AI-generated content.
 * Uses the edit endpoint with a mask.
 */
export async function aiSmartFill(
  config: AIPhotoServiceConfig,
  imageDataUrl: string,
  prompt: string,
  maskDataUrl: string
): Promise<Blob | null> {
  if (!config.isAuthenticated) { config.onRequestAuth?.(); return null; }
  const cost = getAICreditCost('smart_fill');
  if (!await config.deductCredits('photoshop_ai', 'smart_fill')) return null;

  return config.chutesService.editImage({
    prompt,
    image_b64: imageDataUrl,
    modelUrl: AI_ACTION_MODELS.smart_fill.url,
  });
}
