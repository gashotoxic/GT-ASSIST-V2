import { Ltx23AdvancedSettings } from '../types';

export const isLtx23Model = (modelId?: string): boolean => {
    return !!modelId && (modelId.startsWith('ltx-23') || modelId.includes('ltx-23'));
};

export const normalizeWidthHeight = (val: number): number => {
    const clamped = Math.max(256, Math.min(3840, val));
    return Math.round(clamped / 64) * 64;
};

export const normalizeNumFrames = (val: number): number => {
    const clamped = Math.max(1, Math.min(481, val));
    // Find nearest 8k+1: x = 8k + 1 => (x-1)/8 = k
    const k = Math.round((clamped - 1) / 8);
    const result = k * 8 + 1;
    return Math.max(1, result);
};

export const normalizeFps = (val: number): number => {
    return Math.max(8, Math.min(50, val));
};

export const stripDataUrlPrefix = (b64: string | null | undefined): string | null => {
    if (!b64) return null;
    if (b64.includes('base64,')) {
        return b64.split('base64,')[1];
    }
    return b64;
};

export const buildLtx23GenerationInput = (
    prompt: string,
    settings: Ltx23AdvancedSettings,
    conditioningImage?: string | null,
    _conditioningVideoUrl?: string | null,
    _conditioningKeyframeStart?: string | null,
    _conditioningKeyframeEnd?: string | null
): any => {
    const input: any = {
        prompt,
        negative_prompt: settings.negative_prompt || 'shaky, glitchy, low quality, worst quality, deformed, distorted',
        width: normalizeWidthHeight(settings.width ?? 768),
        height: normalizeWidthHeight(settings.height ?? 512),
        num_frames: settings.num_frames ?? null,
        fps: normalizeFps(settings.fps ?? 24),
        duration: settings.duration ?? null,
        guidance_scale: settings.guidance_scale ?? 3.1,
        seed: settings.seed ?? null,
        use_random_seed: settings.use_random_seed ?? true,
        input_image_b64: null,
        keyframes: null,
        enhance_prompt: settings.enhance_prompt ?? false,
        generate_audio: settings.generate_audio ?? true,
        video_format: 'mp4',
        return_json: false
    };

    // Conditioning: if we have a single image, pass as input_image_b64
    if (conditioningImage) {
        const b64 = stripDataUrlPrefix(conditioningImage);
        if (b64) {
            input.input_image_b64 = b64;
        }
    }

    // Keyframe interpolation: if we have start and end keyframes
    if (_conditioningKeyframeStart && _conditioningKeyframeEnd) {
        const start = stripDataUrlPrefix(_conditioningKeyframeStart);
        const end = stripDataUrlPrefix(_conditioningKeyframeEnd);
        if (start && end) {
            input.keyframes = [
                { image_b64: start, frame_idx: 0 },
                { image_b64: end, frame_idx: (input.num_frames || 97) - 1 }
            ];
            input.input_image_b64 = null; // keyframes overrides single image
        }
    }

    // JSON Override (Shallow Merge)
    if (settings.json_override && settings.json_override.trim()) {
        try {
            const override = JSON.parse(settings.json_override);
            Object.assign(input, override);
        } catch (e) {
            console.warn("Failed to parse LTX 2.3 JSON override", e);
        }
    }

    return input;
};

export const wrapLtx23Args = (generationInput: any): any => {
    return generationInput;
};
