import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, Upload, X, Video, Image as ImageIcon } from 'lucide-react';
import { Button, Input, Textarea, Select, Label } from '../UI';
import { Ltx2AdvancedSettings } from '../../types';

interface Ltx2AdvancedOptionsProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    videoMode: 'i2v' | 't2v';
    settings: Ltx2AdvancedSettings;
    setSettings: (settings: Ltx2AdvancedSettings) => void;
    videoUrl: string;
    setVideoUrl: (url: string) => void;
    keyframeStart: string | null;
    setKeyframeStart: (val: string | null) => void;
    keyframeEnd: string | null;
    setKeyframeEnd: (val: string | null) => void;
    onPickVideoFromGallery: () => void;
}

export const Ltx2AdvancedOptions: React.FC<Ltx2AdvancedOptionsProps> = ({
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

    const updateSetting = <K extends keyof Ltx2AdvancedSettings>(key: K, value: Ltx2AdvancedSettings[K]) => {
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
                    Advanced Settings (LTX-2)
                </button>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 max-h-[65vh] overflow-y-auto overscroll-contain sm:max-h-none sm:overflow-visible">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">LTX-2 Advanced</h4>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <ChevronUp className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Pipeline Preset</Label>
                    <Select
                        value={settings.pipeline}
                        onChange={(e) => updateSetting('pipeline', e.target.value as any)}
                    >
                        <option value="distilled">Fast (Distilled)</option>
                        <option value="two_stage">Pro (Two Stage)</option>
                        <option value="ic_lora">Transform (IC LoRA)</option>
                        <option value="keyframe_interp">Keyframe Interpolation</option>
                    </Select>
                </div>

                <div>
                    <Label>Conditioning</Label>
                    <Select
                        value={settings.conditioning}
                        onChange={(e) => updateSetting('conditioning', e.target.value as any)}
                    >
                        <option value="auto">Auto (Default)</option>
                        <option value="none">None (Generation)</option>
                        <option value="image">Image (Start Frame)</option>
                        <option value="video_url">Video URL</option>
                        <option value="keyframes">Keyframes (Start/End)</option>
                    </Select>
                </div>
            </div>

            {/* Conditioning Inputs */}
            {settings.conditioning === 'video_url' && (
                <div className="space-y-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10">
                    <Label>Video URL</Label>
                    <div className="flex gap-2">
                        <Input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1"
                        />
                        <Button variant="secondary" size="sm" onClick={onPickVideoFromGallery}>
                            <Video className="w-4 h-4" />
                        </Button>
                    </div>
                    {!videoUrl && <p className="text-xs text-amber-500">Video URL is required for this mode.</p>}
                </div>
            )}

            {(settings.conditioning === 'keyframes' || settings.pipeline === 'keyframe_interp') && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10">
                    <div>
                        <Label className="mb-1 block">Start Frame</Label>
                        <div
                            className="h-24 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 overflow-hidden relative group"
                            onClick={() => keyframeStartRef.current?.click()}
                        >
                            {keyframeStart ? (
                                <>
                                    <img src={keyframeStart} alt="Start" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="w-5 h-5 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                                    <span className="text-xs">Upload</span>
                                </div>
                            )}
                            <input ref={keyframeStartRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setKeyframeStart)} />
                        </div>
                    </div>
                    <div>
                        <Label className="mb-1 block">End Frame</Label>
                        <div
                            className="h-24 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 overflow-hidden relative group"
                            onClick={() => keyframeEndRef.current?.click()}
                        >
                            {keyframeEnd ? (
                                <>
                                    <img src={keyframeEnd} alt="End" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="w-5 h-5 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                                    <span className="text-xs">Upload</span>
                                </div>
                            )}
                            <input ref={keyframeEndRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setKeyframeEnd)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Knobs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                        type="number"
                        value={settings.width}
                        onChange={(e) => updateSetting('width', Number(e.target.value))}
                        step={32}
                        min={128}
                        max={1920}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                        type="number"
                        value={settings.height}
                        onChange={(e) => updateSetting('height', Number(e.target.value))}
                        step={32}
                        min={128}
                        max={1920}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">FPS</Label>
                    <Input
                        type="number"
                        value={settings.frame_rate}
                        onChange={(e) => updateSetting('frame_rate', Number(e.target.value))}
                        min={1}
                        max={60}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">Frames</Label>
                    <Input
                        type="number"
                        value={settings.num_frames}
                        onChange={(e) => updateSetting('num_frames', Number(e.target.value))}
                        step={8}
                        min={1}
                        max={481}
                        className="h-8 text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <Label className="text-xs">Img Strength</Label>
                    <Input
                        type="number"
                        value={settings.image_strength}
                        onChange={(e) => updateSetting('image_strength', Number(e.target.value))}
                        step={0.1}
                        min={0}
                        max={2}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">Vid Strength</Label>
                    <Input
                        type="number"
                        value={settings.video_strength}
                        onChange={(e) => updateSetting('video_strength', Number(e.target.value))}
                        step={0.1}
                        min={0}
                        max={2}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">CFG Scale</Label>
                    <Input
                        type="number"
                        value={settings.cfg_guidance_scale}
                        onChange={(e) => updateSetting('cfg_guidance_scale', Number(e.target.value))}
                        step={0.5}
                        min={0}
                        max={10}
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <Label className="text-xs">Steps</Label>
                    <Input
                        type="number"
                        value={settings.num_inference_steps}
                        onChange={(e) => updateSetting('num_inference_steps', Number(e.target.value))}
                        min={1}
                        max={80}
                        className="h-8 text-sm"
                    />
                </div>
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs">Seed (Optional)</Label>
                    <Input
                        type="number"
                        value={settings.seed ?? ''}
                        onChange={(e) => updateSetting('seed', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Random"
                        className="h-8 text-sm"
                    />
                </div>
                 <div className="flex items-center gap-2 pt-5">
                    <input
                        type="checkbox"
                        id="enhance_prompt_toggle"
                        checked={settings.enhance_prompt}
                        onChange={(e) => updateSetting('enhance_prompt', e.target.checked)}
                        className="rounded border-gray-300 dark:border-white/20 text-primary focus:ring-primary"
                    />
                    <label htmlFor="enhance_prompt_toggle" className="text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        Enhance Prompt (LTX-2)
                    </label>
                </div>
            </div>


            <div>
                <Label className="text-xs">Negative Prompt</Label>
                <Input
                    value={settings.negative_prompt}
                    onChange={(e) => updateSetting('negative_prompt', e.target.value)}
                    className="h-8 text-sm"
                />
            </div>

            <div>
                <Label className="text-xs">Extra JSON Override (Optional)</Label>
                <Textarea
                    value={settings.json_override}
                    onChange={(e) => updateSetting('json_override', e.target.value)}
                    placeholder='{"loras": [{"name": "...", "strength": 1}]}'
                    className="h-16 text-xs font-mono"
                />
            </div>
        </div>
    );
};
