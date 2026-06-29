import React, { useRef } from 'react';
import { FileImage, Type, Upload, Download, Video, Wand2, Loader2, Film } from 'lucide-react';
import { Button, Textarea, Select, Label } from '../UI';
import { AVAILABLE_VIDEO_MODELS, Ltx23AdvancedSettings } from '../../types';
import { Ltx23AdvancedOptions } from './Ltx23AdvancedOptions';

export function VideoAnimatorPanel(props: {
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  canAfford: (action: string, model: string) => boolean;
  isGenerating: boolean;
  videoMode: 'i2v' | 't2v';
  setVideoMode: (mode: 'i2v' | 't2v') => void;
  selectedVideoModel: string;
  setSelectedVideoModel: (model: string) => void;
  sourceImage: string | null;
  setSourceImage: (val: string | null) => void;
  videoPrompt: string;
  setVideoPrompt: (val: string) => void;
  isEnhancing: boolean;
  onEnhancePrompt: () => void;
  onGenerate: () => void;
  onDownloadBase64: (base64Data: string, filename: string) => void;
  // LTX-2 Props
  ltx23Settings: Ltx23AdvancedSettings;
  setLtx2Settings: (settings: Ltx23AdvancedSettings) => void;
  ltx2VideoUrl: string;
  setLtx2VideoUrl: (url: string) => void;
  ltx2KeyframeStart: string | null;
  setLtx2KeyframeStart: (val: string | null) => void;
  ltx2KeyframeEnd: string | null;
  setLtx2KeyframeEnd: (val: string | null) => void;
  onPickVideoFromGallery: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLtx2Open, setIsLtx2Open] = React.useState(false);

  const isLtx2 = props.selectedVideoModel.includes('ltx-23');
  const isKeyframeMode = Boolean(props.ltx2KeyframeStart && props.ltx2KeyframeEnd);
  const hasKeyframeStart = Boolean(props.ltx2KeyframeStart);
  const hasKeyframeEnd = Boolean(props.ltx2KeyframeEnd);
  const ltx2MissingRequiredInputs =
    isLtx2 &&
    ((isKeyframeMode && (!hasKeyframeStart || !hasKeyframeEnd)));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      props.setSourceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div id="tour-video-mode-selector" className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10">
        <button
          onClick={() => props.setVideoMode('i2v')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${props.videoMode === 'i2v' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <FileImage className="w-4 h-4" /> Image-to-Video
        </button>
        <button
          onClick={() => props.setVideoMode('t2v')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${props.videoMode === 't2v' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <Type className="w-4 h-4" /> Text-to-Video
        </button>
      </div>

      <div id="tour-video-model" className="bg-white/30 dark:bg-slate-800/30 p-3 rounded-xl border border-white/40 dark:border-white/5">
        <Label className="mb-2 block text-xs uppercase text-gray-500 font-bold">Model Engine</Label>
        <Select value={props.selectedVideoModel} onChange={(e) => { const model = AVAILABLE_VIDEO_MODELS.find(v => v.id === e.target.value); if (!(model as any)?.disabled) props.setSelectedVideoModel(e.target.value); }}>
          {AVAILABLE_VIDEO_MODELS.filter(m => m.type === props.videoMode).map(m => (
            <option key={m.id} value={m.id} disabled={(m as any).disabled}>{m.name}</option>
          ))}
        </Select>
      </div>

      {props.videoMode === 'i2v' && (
        <div id="tour-video-input-frame" className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <Label>Input Frame</Label>
          <div
            className="relative h-56 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden group shadow-inner"
          >
            {props.sourceImage ? (
              <>
                <img src={props.sourceImage} alt="Source" className="w-full h-full object-contain cursor-pointer" onClick={() => fileInputRef.current?.click()} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center backdrop-blur-sm pointer-events-none">
                  <span className="text-white font-medium flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20"><Upload className="w-4 h-4" /> Change Frame</span>
                </div>
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                  <Button
                    variant="glass"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); props.onDownloadBase64(props.sourceImage!, 'source-frame.png'); }}
                    title="Download Source Frame"
                    className="h-8 w-8 bg-black/50 text-white border-none hover:bg-black/70"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center p-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-8 h-8 text-primary/60" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Click to Upload Frame</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
      )}

      <div id="tour-video-prompt" className="space-y-3 relative">
        <div className="flex justify-between items-center">
          <Label>{props.videoMode === 'i2v' ? 'Motion Prompt' : 'Video Description'}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onEnhancePrompt}
            disabled={props.isEnhancing || !props.videoPrompt}
            className="h-6 text-xs text-primary hover:text-primary-dark px-2 gap-1.5"
          >
            {props.isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Magic Enhance
          </Button>
        </div>
        <Textarea
          value={props.videoPrompt}
          onChange={(e) => props.setVideoPrompt(e.target.value)}
          placeholder={props.videoMode === 'i2v' ? "Camera pans right, the leaves are blowing..." : "A cinematic drone shot of a cyberpunk city at night, raining..."}
          className="h-32 text-base"
        />

        {isLtx2 && (
            <Ltx23AdvancedOptions
                isOpen={isLtx2Open}
                setIsOpen={setIsLtx2Open}
                videoMode={props.videoMode}
                settings={props.ltx23Settings}
                setSettings={props.setLtx2Settings}
                videoUrl={props.ltx2VideoUrl}
                setVideoUrl={props.setLtx2VideoUrl}
                keyframeStart={props.ltx2KeyframeStart}
                setKeyframeStart={props.setLtx2KeyframeStart}
                keyframeEnd={props.ltx2KeyframeEnd}
                setKeyframeEnd={props.setLtx2KeyframeEnd}
                onPickVideoFromGallery={props.onPickVideoFromGallery}
            />
        )}
      </div>


      <div id="tour-video-generate">
        <Button
          onClick={() => props.isAuthenticated ? props.onGenerate() : props.onRequestAuth()}
          disabled={props.isGenerating || !props.videoPrompt || (props.videoMode === 'i2v' && !props.sourceImage) || ltx2MissingRequiredInputs || !props.isAuthenticated || !props.canAfford('video', props.selectedVideoModel)}
          className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${props.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
        >
          {props.isGenerating ? 'Animating...' : (props.isAuthenticated ? <><Film className="w-5 h-5 mr-2" /> Animate Video</> : 'Sign In to Animate Video')}
        </Button>
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">Video generation typically takes 60-90 seconds.</p>
      </div>
    </div>
  );
}
