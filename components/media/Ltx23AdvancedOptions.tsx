import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, Upload, Video, Image as ImageIcon } from 'lucide-react';
import { Button, Input, Textarea, Select, Label } from '../UI';
import { Ltx23AdvancedSettings } from '../../types';

interface Ltx23AdvancedOptionsProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    videoMode: 'i2v' | 't2v';
    settings: Ltx23AdvancedSettings;
    setSettings: (settings: Ltx23AdvancedSettings) => void;
    videoUrl: string;
    setVideoUrl: (url: string) => void;
    keyframeStart: string | null;
    setKeyframeStart: (val: string | null) => void;
    keyframeEnd: string | null;
    setKeyframeEnd: (val: string | null) => void;
    onPickVideoFromGallery: () => void;
}

const RESOLUTION_PRESETS = [
    { label: 'Quick (768x512)', w: 768, h: 512 },
    { label: 'Square (768x768)', w: 768, h: 768 },
    { label: 'Portrait (768x1024)', w: 768, h: 1024 },
    { label: '720p (1280x720)', w: 1280, h: 720 },
    { label: '1080p (1920x1080)', w: 1920, h: 1080 },
];

export const Ltx23AdvancedOptions: React.FC<Ltx23AdvancedOptionsProps> = ({
    isOpen,
    setIsOpen,
    videoMode,
    settings,
    setSettings,
    videoUrl,
    setVideoUrl,
    keyframeStart,
    setKeyframeStart,
    keyframeEnd,
    setKeyframeEnd,
    onPickVideoFromGallery
}) => {
    const keyframeStartRef = useRef<HTMLInputElement>(null);
    const keyframeEndRef = useRef<HTMLInputElement>(null);

    const update = <K extends keyof Ltx23AdvancedSettings>(key: K, value: Ltx23AdvancedSettings[K]) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setter(reader.result as string);
        reader.readAsDataURL(file);
    };

    if (!isOpen) {
        return (
            <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors w-full"
                >
                    <ChevronDown className="w-4 h-4" />
                    Advanced Settings (LTX 2.3)
                </button>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 max-h-[65vh] overflow-y-auto overscroll-contain sm:max-h-none sm:overflow-visible">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">LTX 2.3 Advanced</h4>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <ChevronUp className="w-4 h-4" />
                </button>
            </div>

            {/* Resolution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Width</Label>
                    <Input
                        type="number"
                        value={settings.width ?? 768}
                        onChange={(e) => update('width', parseInt(e.target.value) || 768)}
                        min={256}
                        max={3840}
                        step={64}
                    />
                </div>
                <div>
                    <Label>Height</Label>
                    <Input
                        type="number"
                        value={settings.height ?? 512}
                        onChange={(e) => update('height', parseInt(e.target.value) || 512)}
                        min={256}
                        max={2160}
                        step={64}
                    />
                </div>
            </div>

            {/* Resolution Presets */}
            <div>
                <Label>Resolution Presets</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                    {RESOLUTION_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                update('width', preset.w);
                                update('height', preset.h);
                            }}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                settings.width === preset.w && settings.height === preset.h
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-gray-200 dark:border-white/10 hover:border-primary/50'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* FPS */}
            <div>
                <Label>FPS ({settings.fps ?? 24})</Label>
                <Input
                    type="range"
                    value={settings.fps ?? 24}
                    onChange={(e) => update('fps', parseInt(e.target.value))}
                    min={8}
                    max={50}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>8</span>
                    <span>24</span>
                    <span>50</span>
                </div>
            </div>

            {/* Num Frames + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Num Frames (optional)</Label>
                    <Input
                        type="number"
                        value={settings.num_frames ?? ''}
                        onChange={(e) => update('num_frames', e.target.value ? parseInt(e.target.value) : null)}
                        min={1}
                        max={481}
                        placeholder="e.g. 97 (~4s)"
                    />
                </div>
                <div>
                    <Label>Duration (s, optional)</Label>
                    <Input
                        type="number"
                        value={settings.duration ?? ''}
                        onChange={(e) => update('duration', e.target.value ? parseFloat(e.target.value) : null)}
                        min={1}
                        max={20}
                        step={0.5}
                        placeholder="e.g. 4"
                    />
                </div>
            </div>

            {/* Guidance Scale */}
            <div>
                <Label>Guidance Scale ({settings.guidance_scale ?? 3.1})</Label>
                <Input
                    type="range"
                    value={settings.guidance_scale ?? 3.1}
                    onChange={(e) => update('guidance_scale', parseFloat(e.target.value))}
                    min={1}
                    max={5.1}
                    step={0.1}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>1.0</span>
                    <span>3.1</span>
                    <span>5.1</span>
                </div>
            </div>

            {/* Seed */}
            <div>
                <Label>Seed</Label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={settings.seed ?? ''}
                        onChange={(e) => update('seed', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Random (leave empty)"
                        className="flex-1"
                        disabled={settings.use_random_seed}
                    />
                    <label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.use_random_seed}
                            onChange={(e) => update('use_random_seed', e.target.checked)}
                            className="rounded"
                        />
                        Random
                    </label>
                </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.enhance_prompt}
                        onChange={(e) => update('enhance_prompt', e.target.checked)}
                        className="rounded"
                    />
                    Enhance Prompt
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.generate_audio}
                        onChange={(e) => update('generate_audio', e.target.checked)}
                        className="rounded"
                    />
                    Generate Audio
                </label>
            </div>

            {/* Negative Prompt */}
            <div>
                <Label>Negative Prompt</Label>
                <Textarea
                    value={settings.negative_prompt}
                    onChange={(e) => update('negative_prompt', e.target.value)}
                    placeholder="shaky, glitchy, low quality..."
                    rows={2}
                />
            </div>

            {/* JSON Override */}
            <div>
                <Label>JSON Override (advanced)</Label>
                <Textarea
                    value={settings.json_override}
                    onChange={(e) => update('json_override', e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={2}
                    className="font-mono text-xs"
                />
            </div>

            {/* I2V / Keyframe inputs */}
            {videoMode === 'i2v' && (
                <>
                    <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Keyframe Interpolation</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Keyframe Start</Label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        ref={keyframeStartRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, setKeyframeStart)}
                                        className="hidden"
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => keyframeStartRef.current?.click()}
                                        className="flex items-center gap-1.5"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        {keyframeStart ? 'Change' : 'Upload'}
                                    </Button>
                                    {keyframeStart && (
                                        <button
                                            onClick={() => setKeyframeStart(null)}
                                            className="text-red-400 hover:text-red-600 text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {keyframeStart && (
                                    <img src={keyframeStart} alt="Start" className="w-16 h-16 object-cover rounded mt-2" />
                                )}
                            </div>
                            <div>
                                <Label>Keyframe End</Label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        ref={keyframeEndRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, setKeyframeEnd)}
                                        className="hidden"
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => keyframeEndRef.current?.click()}
                                        className="flex items-center gap-1.5"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        {keyframeEnd ? 'Change' : 'Upload'}
                                    </Button>
                                    {keyframeEnd && (
                                        <button
                                            onClick={() => setKeyframeEnd(null)}
                                            className="text-red-400 hover:text-red-600 text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {keyframeEnd && (
                                    <img src={keyframeEnd} alt="End" className="w-16 h-16 object-cover rounded mt-2" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Video URL input */}
                    <div>
                        <Label>Or Conditioning Video URL</Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://..."
                                className="flex-1"
                            />
                            <Button size="sm" variant="secondary" onClick={onPickVideoFromGallery}>
                                <Video className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
