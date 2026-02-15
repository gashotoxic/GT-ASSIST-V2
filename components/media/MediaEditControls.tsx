import React from 'react';
import { Download, Scissors, Upload } from 'lucide-react';
import { Button, Label, Select, Textarea } from '../UI';
import { ImageAspectRatio } from '../../types';

type GenerationState = {
  isGenerating: boolean;
  progress: number;
};

export const MediaEditControls: React.FC<{
  editSourceImage: string | null;
  setEditSourceImage: (v: string | null) => void;
  editInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => void;
  editAspectRatio: ImageAspectRatio;
  setEditAspectRatio: (v: ImageAspectRatio) => void;
  editPrompt: string;
  setEditPrompt: (v: string) => void;
  applyQuickEdit: (prompt: string) => void;
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  onGenerate: () => void;
  canAfford: (action: string, model: string) => boolean;
  genStatus: GenerationState;
  Progress: React.ComponentType<{ value: number }>;
  downloadBase64: (base64Data: string, filename: string) => void;
}> = ({
  editSourceImage,
  setEditSourceImage,
  editInputRef,
  handleFileUpload,
  editAspectRatio,
  setEditAspectRatio,
  editPrompt,
  setEditPrompt,
  applyQuickEdit,
  isAuthenticated,
  onRequestAuth,
  onGenerate,
  canAfford,
  genStatus,
  Progress,
  downloadBase64,
}) => {
  return (
    <div className="space-y-6">
      <div id="tour-edit-input-image" className="space-y-3">
        <Label>Image to Edit</Label>
        <div
          className="relative h-56 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden group shadow-inner"
        >
          {editSourceImage ? (
            <>
              <img src={editSourceImage} alt="Source" className="w-full h-full object-contain cursor-pointer" onClick={() => editInputRef.current?.click()} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center backdrop-blur-sm pointer-events-none">
                <span className="text-white font-medium flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                  <Upload className="w-4 h-4" /> Change Image
                </span>
              </div>
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                <Button
                  variant="glass"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); downloadBase64(editSourceImage, 'source-edit.png'); }}
                  title="Download Source Image"
                  className="h-8 w-8 bg-black/50 text-white border-none hover:bg-black/70"
                >
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
          <input ref={editInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setEditSourceImage)} />
        </div>
      </div>

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
          className="h-32 text-base"
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

      <div id="tour-edit-apply">
        <Button
          onClick={() => isAuthenticated ? onGenerate() : onRequestAuth()}
          disabled={genStatus.isGenerating || !editPrompt || !editSourceImage || !isAuthenticated || !canAfford('edit', 'qwen-image-edit')}
          className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${genStatus.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
        >
          {genStatus.isGenerating ? 'Applying Magic...' : (isAuthenticated ? <><Scissors className="w-5 h-5 mr-2" /> Apply Edits</> : 'Sign In to Apply Edits')}
        </Button>
        {genStatus.isGenerating && <Progress value={genStatus.progress} />}
      </div>
    </div>
  );
};

