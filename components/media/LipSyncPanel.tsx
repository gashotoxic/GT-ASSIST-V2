import React, { useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Film, Music, Upload, Sparkles, Video as VideoIcon } from 'lucide-react';
import { Button, Input, Select, Label } from '../UI';
import { AVAILABLE_LIPSYNC_MODELS, MuseTalkLipSyncRequest } from '../../types';

type PreviewKind = 'video' | null;

const isLikelyVideoUrl = (value: string) => {
  const v = (value || '').trim();
  if (!/^https?:\/\//i.test(v)) return false;
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(v);
};

const getDataUrlKind = (value: string): PreviewKind => {
  if (!value.startsWith('data:')) return null;
  const m = value.match(/^data:([^;]+);base64,/i);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  return null;
};

export function LipSyncPanel(props: {
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  canAfford: (action: string, model: string) => boolean;
  isGenerating: boolean;
  onPickFromGallery: () => void;
  onUsePreviewVideo?: () => void;
  canUsePreviewVideo?: boolean;
  videoInput: string;
  setVideoInput: (val: string) => void;
  audioInput: string;
  setAudioInput: (val: string) => void;
  videoPreviewUrl: string | null;
  videoPreviewKind: PreviewKind;
  setVideoPreview: (kind: PreviewKind, url: string | null) => void;
  audioPreviewUrl: string | null;
  setAudioPreviewUrl: (url: string | null) => void;
  advancedOpen: boolean;
  setAdvancedOpen: (open: boolean) => void;
  videoUrl: string;
  setVideoUrl: (val: string) => void;
  audioUrl: string;
  setAudioUrl: (val: string) => void;
  fps: number;
  setFps: (val: number) => void;
  batchSize: number;
  setBatchSize: (val: number) => void;
  extraMargin: number;
  setExtraMargin: (val: number) => void;
  parsingMode: 'jaw' | 'raw';
  setParsingMode: (val: 'jaw' | 'raw') => void;
  leftCheekWidth: number;
  setLeftCheekWidth: (val: number) => void;
  rightCheekWidth: number;
  setRightCheekWidth: (val: number) => void;
  onGenerate: (request: MuseTalkLipSyncRequest) => void;
}) {
  const model = AVAILABLE_LIPSYNC_MODELS[0];
  const videoFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const isVideoReady = useMemo(() => {
    const v = (props.videoInput || '').trim();
    if (!v) return false;
    const kind = getDataUrlKind(v);
    if (kind === 'video') return true;
    return isLikelyVideoUrl(v);
  }, [props.videoInput]);

  const isAudioReady = useMemo(() => {
    return Boolean((props.audioInput || '').trim());
  }, [props.audioInput]);

  const isReady = isVideoReady && isAudioReady;

  const readFileAsDataUrl = (file: File, cb: (val: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleVideoFile = (file: File) => {
    readFileAsDataUrl(file, (dataUrl) => {
      props.setVideoInput(dataUrl);
      const kind = getDataUrlKind(dataUrl);
      props.setVideoPreview(kind, dataUrl);
      props.setVideoUrl('');
    });
  };

  const handleAudioFile = (file: File) => {
    readFileAsDataUrl(file, (dataUrl) => {
      props.setAudioInput(dataUrl);
      props.setAudioPreviewUrl(dataUrl);
      props.setAudioUrl('');
    });
  };

  const handleGenerate = () => {
    props.onGenerate({
      modelUrl: model.url,
      video_input: (props.videoInput || '').trim(),
      audio_input: (props.audioInput || '').trim(),
      fps: props.fps,
      batch_size: props.batchSize,
      extra_margin: props.extraMargin,
      parsing_mode: props.parsingMode,
      left_cheek_width: props.leftCheekWidth,
      right_cheek_width: props.rightCheekWidth
    });
  };

  return (
    <div className="space-y-6 max-h-[70vh] lg:max-h-[calc(100vh-18rem)] overflow-y-auto pr-1 custom-scrollbar">
      <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
          <Label className="flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-primary" /> Video
          </Label>
          <div className="flex flex-wrap items-center gap-2 justify-end xs:justify-end">
            <Button variant="glass" size="sm" onClick={props.onPickFromGallery} className="h-8 text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Choose from Gallery
            </Button>
            {props.canUsePreviewVideo && props.onUsePreviewVideo && (
              <Button variant="glass" size="sm" onClick={props.onUsePreviewVideo} className="h-8 text-xs">
                Use Preview
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => videoFileRef.current?.click()} className="h-8 text-xs">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
            </Button>
          </div>
        </div>

        <input
          ref={videoFileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleVideoFile(file);
          }}
        />

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-white/30 dark:border-white/10 bg-black/10 dark:bg-black/30 overflow-hidden">
            {props.videoPreviewUrl ? (
              <video src={props.videoPreviewUrl} className="w-full h-48 object-contain bg-black/10" controls playsInline />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <VideoIcon className="w-8 h-8 mb-2 opacity-70" />
                <div className="text-sm font-medium">Select a video (or use Gallery)</div>
                <div className="text-xs opacity-80">Lip sync requires a video input</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
          <Label className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" /> Audio
          </Label>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => audioFileRef.current?.click()} className="h-8 text-xs">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
            </Button>
          </div>
        </div>

        <input
          ref={audioFileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleAudioFile(file);
          }}
        />

        <div className="rounded-xl border border-white/30 dark:border-white/10 bg-black/10 dark:bg-black/30 p-3">
          {props.audioPreviewUrl ? (
            <audio controls src={props.audioPreviewUrl} className="w-full" />
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">Upload an audio clip (or paste an audio URL in Advanced).</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => props.setAdvancedOpen(!props.advancedOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-sm font-bold text-gray-800 dark:text-gray-100">Advanced Options</div>
          {props.advancedOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {props.advancedOpen && (
          <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Video URL</Label>
                <Input
                  value={props.videoUrl}
                  onChange={(e) => {
                    const v = e.target.value;
                    props.setVideoUrl(v);
                    if (v.trim()) {
                      props.setVideoInput(v.trim());
                      props.setVideoPreview('video', v.trim());
                    }
                  }}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Audio URL</Label>
                <Input
                  value={props.audioUrl}
                  onChange={(e) => {
                    const v = e.target.value;
                    props.setAudioUrl(v);
                    if (v.trim()) {
                      props.setAudioInput(v.trim());
                      props.setAudioPreviewUrl(v.trim());
                    }
                  }}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">FPS</Label>
                <Input type="number" min={1} max={60} value={props.fps} onChange={(e) => props.setFps(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Batch Size</Label>
                <Input type="number" min={1} max={32} value={props.batchSize} onChange={(e) => props.setBatchSize(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Extra Margin</Label>
                <Input type="number" min={0} max={50} value={props.extraMargin} onChange={(e) => props.setExtraMargin(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Parsing Mode</Label>
                <Select value={props.parsingMode} onChange={(e) => props.setParsingMode(e.target.value as 'jaw' | 'raw')}>
                  <option value="jaw">jaw</option>
                  <option value="raw">raw</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Left Cheek Width</Label>
                <Input type="number" min={0} max={200} value={props.leftCheekWidth} onChange={(e) => props.setLeftCheekWidth(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Right Cheek Width</Label>
                <Input type="number" min={0} max={200} value={props.rightCheekWidth} onChange={(e) => props.setRightCheekWidth(Number(e.target.value))} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => props.isAuthenticated ? handleGenerate() : props.onRequestAuth()}
          disabled={props.isGenerating || !props.isAuthenticated || !props.canAfford('video', model.id) || !isReady}
          className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${props.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
        >
          {props.isGenerating ? 'Generating...' : (props.isAuthenticated ? 'Generate Lip Sync' : 'Sign In to Generate Lip Sync')}
        </Button>
        <div className="text-[11px] text-center text-gray-500 dark:text-gray-400">
          Best results: a clear face video, ~25fps, short clips.
        </div>
      </div>
    </div>
  );
}
