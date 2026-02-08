import { ChutesService } from './chutes';
import { SupabaseService } from './supabase';
import { AVAILABLE_EDIT_MODELS, AVAILABLE_IMAGE_MODELS, ImageAspectRatio, MediaItem } from '../types';
import { getCreditCost } from './creditCosts';

type SubscriptionTier = 'free' | 'basic' | 'plus' | 'pro';

export type BrandStudioToolName = 'generate_image' | 'edit_image';

export type BrandStudioToolResult =
  | {
    type: 'image';
    url: string;
    mediaItemId: string;
    prompt: string;
  }
  | {
    type: 'error';
    message: string;
  };

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isPlusOrPro(tier: SubscriptionTier): boolean {
  return tier === 'plus' || tier === 'pro';
}

function normalizeBase64(input: string): string {
  if (!input) return '';
  if (input.includes('base64,')) {
    return input.split('base64,')[1] || '';
  }
  return input;
}

export function createBrandStudioToolRuntime(args: {
  chutesService: ChutesService;
  supabaseService: SupabaseService;
  subscriptionTier: SubscriptionTier;
  userId: string | null | undefined;
  sessionId: string;
}): {
  executeTool: (name: BrandStudioToolName, toolArgs: any) => Promise<BrandStudioToolResult>;
} {
  const { chutesService, supabaseService, subscriptionTier, userId, sessionId } = args;

  const ensureAllowed = (): BrandStudioToolResult | null => {
    if (!userId) return { type: 'error', message: 'Sign in required to use Brand Studio tools.' };
    if (!isPlusOrPro(subscriptionTier)) return { type: 'error', message: 'Upgrade to Plus to use Brand Studio tools.' };
    return null;
  };

  const maybeDeductCredits = async (action: 'image' | 'edit', model: string) => {
    if (!userId) return;
    if (subscriptionTier === 'pro') return;
    const cost = getCreditCost(action, model);
    await supabaseService.useCredits(userId, cost, action, model, sessionId);
  };

  const resolveSavedUrl = async (mediaItemId: string): Promise<string | null> => {
    try {
      const history = await supabaseService.getMediaHistory(sessionId);
      const match = history.find(h => h.id === mediaItemId);
      return match?.url || null;
    } catch {
      return null;
    }
  };

  const saveToGallery = async (item: MediaItem, blob: Blob) => {
    await supabaseService.saveMediaItem(item, blob, sessionId, userId || undefined);
  };

  const executeTool = async (name: BrandStudioToolName, toolArgs: any): Promise<BrandStudioToolResult> => {
    const gateError = ensureAllowed();
    if (gateError) return gateError;

    try {
      if (name === 'generate_image') {
        const prompt: string = String(toolArgs?.prompt || '').trim();
        const aspectRatio = toolArgs?.aspectRatio as ImageAspectRatio | undefined;
        if (!prompt) return { type: 'error', message: 'Missing prompt for image generation.' };

        const model = AVAILABLE_IMAGE_MODELS.find(m => m.id === 'z-image-turbo') || AVAILABLE_IMAGE_MODELS[0];
        await maybeDeductCredits('image', model.id);
        const blob = await chutesService.generateImage({ prompt, modelUrl: model.url, modelId: model.id, aspectRatio });

        const id = createId();
        const item: MediaItem = {
          id,
          type: 'image',
          prompt,
          createdAt: Date.now(),
          sessionId
        };
        await saveToGallery(item, blob);
        const url = (await resolveSavedUrl(id)) || URL.createObjectURL(blob);

        return { type: 'image', url, mediaItemId: id, prompt };
      }

      if (name === 'edit_image') {
        const prompt: string = String(toolArgs?.prompt || '').trim();
        const rawImage: string = String(toolArgs?.image_b64 || '').trim();
        const aspectRatio = toolArgs?.aspectRatio as ImageAspectRatio | undefined;
        if (!prompt) return { type: 'error', message: 'Missing prompt for image edit.' };
        if (!rawImage) return { type: 'error', message: 'Missing image for image edit.' };

        const model = AVAILABLE_EDIT_MODELS.find(m => m.id === 'qwen-image-edit') || AVAILABLE_EDIT_MODELS[0];
        await maybeDeductCredits('edit', model.id);

        const blob = await chutesService.editImage({
          prompt,
          image_b64: normalizeBase64(rawImage),
          modelUrl: model.url,
          aspectRatio
        });

        const id = createId();
        const item: MediaItem = {
          id,
          type: 'image',
          prompt,
          createdAt: Date.now(),
          sessionId
        };
        await saveToGallery(item, blob);
        const url = (await resolveSavedUrl(id)) || URL.createObjectURL(blob);

        return { type: 'image', url, mediaItemId: id, prompt };
      }

      return { type: 'error', message: `Unknown tool: ${name}` };
    } catch (err: any) {
      const message = (err?.message || String(err || '')).trim() || 'Tool execution failed.';
      return { type: 'error', message };
    }
  };

  return { executeTool };
}
