import React from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button, Input, Label, Select, Textarea } from '../UI';
import { AVAILABLE_IMAGE_MODELS, ImageAspectRatio } from '../../types';

type GenerationState = {
  isGenerating: boolean;
  progress: number;
};

export const MediaImageControls: React.FC<{
  selectedImageModel: string;
  setSelectedImageModel: (v: string) => void;
  customImageModelUrl: string;
  setCustomImageModelUrl: (v: string) => void;
  imageAspectRatio: ImageAspectRatio;
  setImageAspectRatio: (v: ImageAspectRatio) => void;
  imagePrompt: string;
  setImagePrompt: (v: string) => void;
  isEnhancing: boolean;
  onEnhancePrompt: () => void;
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  onGenerate: () => void;
  canAfford: (action: string, model: string) => boolean;
  genStatus: GenerationState;
  Progress: React.ComponentType<{ value: number }>;
}> = ({
  selectedImageModel,
  setSelectedImageModel,
  customImageModelUrl,
  setCustomImageModelUrl,
  imageAspectRatio,
  setImageAspectRatio,
  imagePrompt,
  setImagePrompt,
  isEnhancing,
  onEnhancePrompt,
  isAuthenticated,
  onRequestAuth,
  onGenerate,
  canAfford,
  genStatus,
  Progress,
}) => {
  return (
    <div className="space-y-6">
      <div id="tour-image-model" className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
        <Label className="mb-2 block">Model</Label>
        <Select value={selectedImageModel} onChange={(e) => setSelectedImageModel(e.target.value)}>
          {AVAILABLE_IMAGE_MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
          <option value="custom">Custom URL...</option>
        </Select>

        {selectedImageModel === 'custom' && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
            <Label className="mb-1 block text-xs">Custom Endpoint URL</Label>
            <Input value={customImageModelUrl} onChange={(e) => setCustomImageModelUrl(e.target.value)} placeholder="https://chutes-..." size="sm" />
          </div>
        )}
      </div>

      <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
        <Label className="mb-2 block">Aspect Ratio</Label>
        <Select value={imageAspectRatio} onChange={(e) => setImageAspectRatio(e.target.value as ImageAspectRatio)}>
          <option value="1:1">1:1</option>
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="4:3">4:3</option>
        </Select>
      </div>

      <div id="tour-image-prompt" className="space-y-3 relative">
        <div className="flex justify-between items-center">
          <Label>Prompt</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEnhancePrompt}
            disabled={isEnhancing || !imagePrompt}
            className="h-6 text-xs text-primary hover:text-primary-dark px-2 gap-1.5"
          >
            {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Magic Enhance
          </Button>
        </div>
        <Textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="A futuristic city with flying cars, cyberpunk style, 8k resolution..."
          className="h-40 text-base"
        />
        {AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)?.maxLength && (
          <div className={`text-xs text-right transition-colors ${imagePrompt.length > (AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)?.maxLength || 0) ? 'text-red-500' : 'text-gray-400'}`}>
            {imagePrompt.length} / {AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)?.maxLength}
          </div>
        )}
      </div>

      <div id="tour-image-generate">
        <Button
          onClick={() => isAuthenticated ? onGenerate() : onRequestAuth()}
          disabled={genStatus.isGenerating || !imagePrompt || !isAuthenticated || !canAfford('image', selectedImageModel)}
          className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${genStatus.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
        >
          {genStatus.isGenerating ? 'Generating...' : (isAuthenticated ? <><Sparkles className="w-5 h-5 mr-2" /> Generate Image</> : 'Sign In to Generate Image')}
        </Button>
        {genStatus.isGenerating && <Progress value={genStatus.progress} />}
      </div>
    </div>
  );
};

