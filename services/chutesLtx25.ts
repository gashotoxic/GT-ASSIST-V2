import { Ltx25AdvancedSettings } from '../types';

export const isLtx25Model = (modelId?: string): boolean => {
    return !!modelId && (modelId.startsWith('ltx-25') || modelId.includes('ltx-25'));
};

/** Width/height must be multiples of 32 for LTX 2.5 (not 64 like 2.3) */
export const normalizeWidthHeight25 = (val: number): number => {
    const clamped = Math.max(128, Math.min(3840, val));
    return Math.round(clamped / 32) * 32;
};

/** Frame count snapped to N*8+1 */
export const normalizeNumFrames25 = (val: number): number => {
    const clamped = Math.max(1, Math.min(481, val));
    const k = Math.round((clamped - 1) / 8);
    const result = k * 8 + 1;
    return Math.max(1, result);
};

export const normalizeFps25 = (val: number): number => {
    return Math.max(8, Math.min(50, val));
};

export const stripDataUrlPrefix25 = (b64: string | null | undefined): string | null => {
    if (!b64) return null;
    if (b64.includes('base64,')) {
        return b64.split('base64,')[1];
    }
    return b64;
};

export const buildLtx25GenerationInput = (
    prompt: string,
    settings: Ltx25AdvancedSettings,
    conditioningImage?: string | null,
    _conditioningVideoUrl?: string | null,
    _conditioningKeyframeStart?: string | null,
    _conditioningKeyframeEnd?: string | null
): any => {
    const input: any = {
        prompt,
        width: normalizeWidthHeight25(settings.width ?? 768),
        height: normalizeWidthHeight25(settings.height ?? 512),
        fps: normalizeFps25(settings.fps ?? 24),
        use_random_seed: settings.use_random_seed ?? true,
        enhance_prompt: settings.enhance_prompt ?? false,
        generate_audio: settings.generate_audio ?? true,
        auto_duration: settings.auto_duration ?? false,
        video_format: 'mp4',
        return_json: false
    };

    // Only include optional fields when they have actual values (not null/undefined)
    if (settings.num_frames != null) input.num_frames = settings.num_frames;
    if (settings.duration != null) input.duration = settings.duration;
    if (settings.seed != null) input.seed = settings.seed;
    if (settings.generated_keyframes != null) input.generated_keyframes = settings.generated_keyframes;
    if (settings.stage_1_sigmas?.length) input.stage_1_sigmas = settings.stage_1_sigmas;
    if (settings.stage_2_sigmas?.length) input.stage_2_sigmas = settings.stage_2_sigmas;

    // Conditioning: if we have a single image, pass as input_image_b64
    if (conditioningImage) {
        const b64 = stripDataUrlPrefix25(conditioningImage);
        if (b64) {
            input.input_image_b64 = b64;
        }
    }

    // Keyframe interpolation: if we have start and end keyframes (2+ entries)
    if (_conditioningKeyframeStart && _conditioningKeyframeEnd) {
        const start = stripDataUrlPrefix25(_conditioningKeyframeStart);
        const end = stripDataUrlPrefix25(_conditioningKeyframeEnd);
        if (start && end) {
            input.keyframes = [
                { image_b64: start, frame_idx: 0 },
                { image_b64: end, frame_idx: (input.num_frames || 97) - 1 }
            ];
            delete input.input_image_b64; // keyframes overrides single image
        }
    }

    // JSON Override (Shallow Merge)
    if (settings.json_override && settings.json_override.trim()) {
        try {
            const override = JSON.parse(settings.json_override);
            Object.assign(input, override);
        } catch (e) {
            console.warn("Failed to parse LTX 2.5 JSON override", e);
        }
    }

    return input;
};
