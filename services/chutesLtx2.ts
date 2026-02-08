import { Ltx2AdvancedSettings } from '../types';

export const isLtx2Model = (modelId?: string): boolean => {
    return !!modelId && (modelId.startsWith('ltx-2') || modelId.includes('ltx-2'));
};

export const normalizeWidthHeight = (val: number): number => {
    const clamped = Math.max(128, Math.min(1920, val));
    return Math.round(clamped / 32) * 32;
};

export const normalizeNumFrames = (val: number): number => {
    const clamped = Math.max(1, Math.min(481, val));
    // Find nearest 8k+1: x = 8k + 1 => (x-1)/8 = k
    const k = Math.round((clamped - 1) / 8);
    const result = k * 8 + 1;
    return Math.max(1, result);
};

export const stripDataUrlPrefix = (b64: string | null | undefined): string | null => {
    if (!b64) return null;
    if (b64.includes('base64,')) {
        return b64.split('base64,')[1];
    }
    return b64;
};

export const buildLtx2GenerationInput = (
    prompt: string,
    settings: Ltx2AdvancedSettings,
    conditioningImage?: string | null,
    conditioningVideoUrl?: string | null,
    conditioningKeyframeStart?: string | null,
    conditioningKeyframeEnd?: string | null
): any => {
    const args: any = {
        prompt,
        width: normalizeWidthHeight(settings.width ?? 768),
        height: normalizeWidthHeight(settings.height ?? 512),
        distilled: true,
        image_url: null,
        video_url: null,
        image_b64: null,
        video_b64: null,
        frame_rate: settings.frame_rate ?? 25,
        num_frames: normalizeNumFrames(settings.num_frames ?? 121),
        image_strength: settings.image_strength ?? 1,
        video_strength: settings.video_strength ?? 1,
        negative_prompt: settings.negative_prompt ?? 'low-res, morphing, distortion, warping, flicker, jitter, stutter, shaky camera, erratic motion, temporal artifacts, frame blending, low quality, jpeg artifacts',
        image_frame_index: 0,
        cfg_guidance_scale: settings.cfg_guidance_scale ?? 3,
        num_inference_steps: settings.num_inference_steps ?? 40,
        enhance_prompt: settings.enhance_prompt ?? false
    };

    if (settings.seed !== undefined) {
        args.seed = settings.seed;
    }

    if (settings.pipeline && settings.pipeline !== 'distilled') {
        args.pipeline = settings.pipeline;
        args.distilled = false;
    }

    // Conditioning Logic
    // 'auto' | 'none' | 'image' | 'video_url' | 'keyframes'
    const cond = settings.conditioning;

    if (cond === 'image' || (cond === 'auto' && conditioningImage)) {
        const b64 = stripDataUrlPrefix(conditioningImage);
        if (b64) {
            args.image_b64 = b64;
            args.image_frame_index = 0; // default start
        }
    } else if (cond === 'video_url' && conditioningVideoUrl) {
        args.video_url = conditioningVideoUrl;
    } else if (cond === 'keyframes' || settings.pipeline === 'keyframe_interp') {
        // If pipeline is keyframe_interp, we expect images array
        // or if user explicitly selected keyframes mode
        const start = stripDataUrlPrefix(conditioningKeyframeStart || conditioningImage);
        const end = stripDataUrlPrefix(conditioningKeyframeEnd);
        
        if (start && end) {
            args.pipeline = 'keyframe_interp';
            args.distilled = false;
            args.images = [
                { image_b64: start, frame_index: 0 },
                { image_b64: end, frame_index: args.num_frames - 1 }
            ];
        }
    }

    // JSON Override (Shallow Merge)
    if (settings.json_override && settings.json_override.trim()) {
        try {
            const override = JSON.parse(settings.json_override);
            Object.assign(args, override);
        } catch (e) {
            console.warn("Failed to parse LTX-2 JSON override", e);
        }
    }

    return args;
};

export const wrapLtx2Args = (generationInput: any): any => {
    return { args: generationInput };
};
