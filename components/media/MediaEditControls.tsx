import React from 'react';
import { Download, Scissors, Upload, Image, Wand2, RotateCcw, Palette, ZoomIn } from 'lucide-react';
import { Button, Label, Select, Textarea } from '../UI';
import { ImageAspectRatio, STYLE_PRESETS, EditMode } from '../../types';

type GenerationState = {
  isGenerating: boolean;
  progress: number;
};

const EDIT_MODES: { id: EditMode | 'smart'; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'smart', label: 'Smart Edit', icon: <Scissors className="w-3.5 h-3.5" />, desc: 'Describe what to change' },
  { id: 'remove_bg', label: 'Remove BG', icon: <Image className="w-3.5 h-3.5" />, desc: 'Remove background' },
  { id: 'upscale', label: 'Upscale', icon: <ZoomIn className="w-3.5 h-3.5" />, desc: 'Enhance resolution' },
  { id: 'style_transfer', label: 'Style', icon: <Palette className="w-3.5 h-3.5" />, desc: 'Apply art style' },
];

export const MediaEditControls: React.FC<{
  editSourceImage: string | null;
  setEditSourceImage: (v: string | null) => void;
  editInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => void;
  editAspectRatio: ImageAspectRatio;
  setEditAspectRatio: (v: ImageAspectRatio) => void;
  editPrompt: string;
  setEditPrompt: (v: string) => void;
  editMode: EditMode | 'smart';
  setEditMode: (v: EditMode | 'smart') => void;
  stylePreset: string;
  setStylePreset: (v: string) => void;
  applyQuickEdit: (prompt: string) => void;
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  onGenerate: () => void;
  canAfford: (action: string, model: string) => boolean;
  genStatus: GenerationState;
  Progress: React.ComponentType<{ value: number }>;
  downloadBase64: (base64Data: string, filename: string) => void;
  editHistory: string[];
  onEditAgain: () => void;
  onUndo: () => void;
  onPickFromGallery: () => void;
}> = ({
  editSourceImage,
  setEditSourceImage,
  editInputRef,
  handleFileUpload,
  editAspectRatio,
  setEditAspectRatio,
  editPrompt,
  setEditPrompt,
  editMode,
  setEditMode,
  stylePreset,
  setStylePreset,
  applyQuickEdit,
  isAuthenticated,
  onRequestAuth,
  onGenerate,
  canAfford,
  genStatus,
  Progress,
  downloadBase64,
  editHistory,
  onEditAgain,
  onUndo,
  onPickFromGallery,
}) => {
  return (
    <div className="space-y-6">
      {/* Source Image */}
      <div id="tour-edit-input-image" className="space-y-3">
        <Label>Image to Edit</Label>
        <div className="relative h-48 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden group shadow-inner">
          {editSourceImage ? (
            <>
              <img src={editSourceImage} alt="Source" className="w-full h-full object-contain cursor-pointer" onClick={() => editInputRef.current?.click()} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center backdrop-blur-sm pointer-events-none">
                <span className="text-white font-medium flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  <Upload className="w-4 h-4" /> Change Image
                </span>
              </div>
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                <Button variant="glass" size="icon" onClick={(e) => { e.stopPropagation(); downloadBase64(editSourceImage, 'source-edit.png'); }} title="Download Source Image" className="h-8 w-8 bg-black/50 text-white border-none hover:bg-black/70">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-6 cursor-pointer" onClick={() => editInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-8 h-8 text-primary/60" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Click to Upload Image</span>
            </div>
          )}
          <input ref={editInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setEditSourceImage as any)} />
        </div>
        <Button variant="glass" size="sm" onClick={onPickFromGallery} className="w-full text-xs">
          <Image className="w-3.5 h-3.5 mr-1.5" /> Pick from Gallery
        </Button>
      </div>

      {/* Edit Mode Selector */}
      <div className="bg-white/30 dark:bg-slate-800/30 p-3 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
        <Label className="mb-2 block text-xs">Edit Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          {EDIT_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setEditMode(mode.id as any)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                editMode === mode.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'bg-white/40 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary border border-white/40 dark:border-white/10'
              }`}
            >
              <span className={editMode === mode.id ? 'text-white' : 'text-primary/70'}>{mode.icon}</span>
              <div className="text-left">
                <div className="font-semibold">{mode.label}</div>
                <div className={`text-[10px] opacity-60 ${editMode === mode.id ? 'text-white/70' : ''}`}>{mode.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific inputs */}
      {editMode === 'smart' && (
        <>
          <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
            <Label className="mb-2 block">Aspect Ratio</Label>
            <Select value={editAspectRatio} onChange={(e) => setEditAspectRatio(e.target.value as ImageAspectRatio)}>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
            </Select>
          </div>
          <div id="tour-edit-instruction" className="space-y-3">
            <Label>Edit Instruction</Label>
            <Textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Make it snowing, add a hat, change background to sunset..."
              className="h-28 text-base"
            />
            <div className="flex flex-wrap gap-2">
              {['Make it day', 'Make it night', 'Add fireworks', 'Cyberpunk style'].map(action => (
                <button
                  key={action}
                  onClick={() => applyQuickEdit(action)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-primary/10 hover:text-primary transition-colors text-gray-600 dark:text-gray-400"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {editMode === 'style_transfer' && (
        <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
          <Label className="mb-2 block">Style Preset</Label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => setStylePreset(preset.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  stylePreset === preset.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/40 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary border border-white/40 dark:border-white/10'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Label className="mb-1 block text-xs">Custom style prompt (optional)</Label>
            <Textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Add your own style details..."
              className="h-20 text-sm"
            />
          </div>
        </div>
      )}

      {editMode === 'remove_bg' && (
        <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <Image className="w-5 h-5 text-primary" />
            <span>This will remove the background from your image, keeping only the subject.</span>
          </div>
        </div>
      )}

      {editMode === 'upscale' && (
        <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <ZoomIn className="w-5 h-5 text-primary" />
            <span>This will upscale and enhance your image resolution (2 credits).</span>
          </div>
        </div>
      )}

      {/* Edit History */}
      {editHistory.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">{editHistory.length} edit{s > 1 ? 's' : ''} in history</span>
          <Button variant="ghost" size="sm" onClick={onUndo} className="h-6 text-xs ml-auto text-gray-500 hover:text-primary">
            <RotateCcw className="w-3 h-3 mr-1" /> Undo
          </Button>
        </div>
      )}

      {/* Apply Button */}
      <div id="tour-edit-apply">
        {editHistory.length > 0 && editSourceImage ? (
          <Button
            variant="glass"
            onClick={onEditAgain}
            disabled={genStatus.isGenerating}
            className="w-full h-12 text-base font-semibold rounded-xl mb-3"
          >
            <Scissors className="w-5 h-5 mr-2 text-purple-500" /> Edit Again (Chain)
          </Button>
        ) : null}
        <Button
          onClick={() => isAuthenticated ? onGenerate() : onRequestAuth()}
          disabled={genStatus.isGenerating || (editMode === 'smart' && !editPrompt) || !editSourceImage || !isAuthenticated || !canAfford('edit', editMode === 'upscale' ? 'upscale' : 'qwen-image-edit')}
          className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${genStatus.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
        >
          {genStatus.isGenerating ? (
            <>
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              {editMode === 'remove_bg' ? 'Removing Background...' : editMode === 'upscale' ? 'Upscaling...' : editMode === 'style_transfer' ? 'Applying Style...' : 'Applying Magic...'}
            </>
          ) : isAuthenticated ? (
            <><Wand2 className="w-5 h-5 mr-2" /> {editMode === 'remove_bg' ? 'Remove Background' : editMode === 'upscale' ? 'Upscale Image' : editMode === 'style_transfer' ? 'Apply Style' : 'Apply Edits'}</>
          ) : (
            'Sign In to Apply Edits'
          )}
        </Button>
        {genStatus.isGenerating && <Progress value={genStatus.progress} />}
      </div>
    </div>
  );
};
