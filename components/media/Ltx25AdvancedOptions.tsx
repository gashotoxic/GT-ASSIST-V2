import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input, Textarea, Label } from '../UI';
import { Ltx25AdvancedSettings } from '../../types';

interface Ltx25AdvancedOptionsProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    videoMode: 'i2v' | 't2v';
    settings: Ltx25AdvancedSettings;
    setSettings: (settings: Ltx25AdvancedSettings) => void;
}

const RESOLUTION_PRESETS_25 = [
    { label: 'Quick (768x512)', w: 768, h: 512 },
    { label: 'Square (768x768)', w: 768, h: 768 },
    { label: 'Portrait (768x1024)', w: 768, h: 1024 },
    { label: '720p (1280x720)', w: 1280, h: 720 },
    { label: '1080p (1920x1080)', w: 1920, h: 1080 },
];

export const Ltx25AdvancedOptions: React.FC<Ltx25AdvancedOptionsProps> = ({
    isOpen,
    setIsOpen,
    videoMode: _videoMode,
    settings,
    setSettings,
}) => {
    const update = <K extends keyof Ltx25AdvancedSettings>(key: K, value: Ltx25AdvancedSettings[K]) => {
        setSettings({ ...settings, [key]: value });
    };

    if (!isOpen) {
        return (
            <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors w-full"
                >
                    <ChevronDown className="w-4 h-4" />
                    Advanced Settings (LTX 2.5)
                </button>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 max-h-[65vh] overflow-y-auto overscroll-contain sm:max-h-none sm:overflow-visible">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">LTX 2.5 Advanced</h4>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <ChevronUp className="w-4 h-4" />
                </button>
            </div>

            {/* Resolution — snapped to 32 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Width (×32)</Label>
                    <Input
                        type="number"
                        value={settings.width ?? 768}
                        onChange={(e) => update('width', parseInt(e.target.value) || 768)}
                        min={128}
                        max={3840}
                        step={32}
                    />
                </div>
                <div>
                    <Label>Height (×32)</Label>
                    <Input
                        type="number"
                        value={settings.height ?? 512}
                        onChange={(e) => update('height', parseInt(e.target.value) || 512)}
                        min={128}
                        max={2160}
                        step={32}
                    />
                </div>
            </div>

            {/* Resolution Presets */}
            <div>
                <Label>Resolution Presets</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                    {RESOLUTION_PRESETS_25.map((preset) => (
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
                    <Label>Num Frames (N×8+1)</Label>
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
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.auto_duration}
                        onChange={(e) => update('auto_duration', e.target.checked)}
                        className="rounded"
                    />
                    Auto Duration
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.generated_keyframes != null}
                        onChange={(e) => update('generated_keyframes', e.target.checked ? 3 : null)}
                        className="rounded"
                    />
                    Generated Keyframes
                </label>
            </div>

            {/* Sigma schedules (read-only info) */}
            <div className="space-y-2">
                <Label>Stage 1 Sigmas (8-step)</Label>
                <div className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-slate-800 rounded-lg p-2">
                    {settings.stage_1_sigmas.map((v, i) => v.toFixed(4)).join(', ')}
                </div>
                <Label>Stage 2 Sigmas (3-step)</Label>
                <div className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-slate-800 rounded-lg p-2">
                    {settings.stage_2_sigmas.map((v, i) => v.toFixed(4)).join(', ')}
                </div>
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
        </div>
    );
};
