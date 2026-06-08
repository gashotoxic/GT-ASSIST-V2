import React, { useState } from 'react';
import { AIPhotoAction, AI_ACTION_LABELS, getAICreditCost } from '../../../services/aiPhotoService';

interface AIPanelProps {
  isAuthenticated: boolean;
  isGenerating: boolean;
  onGenerate: (action: AIPhotoAction, prompt: string) => void;
  onRequestAuth: () => void;
}

const MODES: { id: AIPhotoAction; label: string; icon: string; needsPrompt: boolean }[] = [
  { id: 'generate', label: 'Generate', icon: '✨', needsPrompt: true },
  { id: 'edit', label: 'AI Edit', icon: '✏', needsPrompt: true },
  { id: 'remove_bg', label: 'Remove BG', icon: '◇', needsPrompt: false },
  { id: 'upscale', label: 'Upscale', icon: '⬆', needsPrompt: false },
  { id: 'smart_fill', label: 'Smart Fill', icon: '◨', needsPrompt: true },
  { id: 'style_transfer', label: 'Style', icon: '🎨', needsPrompt: true },
];

const STYLE_PRESETS = [
  'Oil Painting', 'Watercolor', 'Sketch', 'Anime',
  'Cinematic', 'Cyberpunk', 'Van Gogh', 'Monet',
];

export const AIPanel: React.FC<AIPanelProps> = ({
  isAuthenticated, isGenerating, onGenerate, onRequestAuth,
}) => {
  const [mode, setMode] = useState<AIPhotoAction>('generate');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Oil Painting');

  const handleApply = () => {
    if (!isAuthenticated) { onRequestAuth(); return; }
    if (isGenerating) return;
    const finalPrompt = mode === 'style_transfer' ? style : prompt;
    if (!finalPrompt && mode !== 'remove_bg' && mode !== 'upscale') return;
    onGenerate(mode, finalPrompt);
  };

  const creditCost = getAICreditCost(mode);

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">AI Tools</div>

      {!isAuthenticated && (
        <button onClick={onRequestAuth}
          className="w-full py-2 text-[10px] rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors border border-amber-500/30"
        >
          🔒 Sign in to use AI tools
        </button>
      )}

      {/* Mode picker */}
      <div className="grid grid-cols-3 gap-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setPrompt(''); }}
            className={`text-[9px] px-1.5 py-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
              mode === m.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <span className="text-[14px]">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Prompt input (for modes that need it) */}
      {MODES.find(m => m.id === mode)?.needsPrompt && (
        mode === 'style_transfer' ? (
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Style</div>
            <div className="flex flex-wrap gap-1">
              {STYLE_PRESETS.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    style === s ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  } transition-colors`}
                >{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] text-slate-500 mb-1">
              {mode === 'generate' ? 'Prompt' : mode === 'edit' ? 'Describe the edit' : 'Describe the fill'}
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={mode === 'generate' ? 'A futuristic cityscape...' : 'Describe what to change...'}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-[11px] text-slate-200 outline-none resize-none focus:ring-1 focus:ring-primary/50 placeholder-slate-600"
            />
          </div>
        )
      )}

      {/* Info for non-prompt modes */}
      {!MODES.find(m => m.id === mode)?.needsPrompt && (
        <div className="text-[9px] text-slate-600 p-2 bg-slate-800/50 rounded">
          {mode === 'remove_bg' ? 'Removes background from the active layer. Make sure the layer has an image.' :
           mode === 'upscale' ? 'Upscales the active layer image 2x with AI enhancement.' : ''}
        </div>
      )}

      {/* Apply button */}
      <button onClick={handleApply}
        disabled={isGenerating || (!isAuthenticated)}
        className={`w-full py-1.5 text-[11px] rounded font-medium transition-colors ${
          isGenerating ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
          !isAuthenticated ? 'bg-slate-800 text-slate-600 cursor-not-allowed' :
          'bg-primary/20 text-primary hover:bg-primary/30'
        }`}
      >
        {isGenerating ? '⏳ Processing...' : `Apply (${creditCost} credit${creditCost > 1 ? 's' : ''})`}
      </button>
    </div>
  );
};
