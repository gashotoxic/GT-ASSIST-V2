import React from 'react';
import { X } from 'lucide-react';
import { AppSettings, AVAILABLE_MODELS, BRAND_STUDIO_MODEL_ID, BRAND_VISION_MODEL_IDS, getModelShortName } from '../types';

type ChatMode = 'chat' | 'brand';

type LogoModelPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  anchorRect?: DOMRect | null;
  anchorEl?: HTMLElement | null;
};

export const LogoModelPicker: React.FC<LogoModelPickerProps> = ({
  isOpen,
  onClose,
  chatMode,
  onChatModeChange,
  settings,
  onUpdateSettings,
  anchorRect,
  anchorEl,
}) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const isDesktopDropdown = typeof window !== 'undefined'
    && window.matchMedia('(min-width: 640px)').matches
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = typeof window !== 'undefined'
    && window.matchMedia('(max-width: 639px)').matches;

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!isDesktopDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (anchorEl && anchorEl.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, isDesktopDropdown, anchorEl, onClose]);

  if (!isOpen) return null;

  const brandModelId = settings.brandModel || BRAND_STUDIO_MODEL_ID;
  const activeModelId = chatMode === 'brand' ? brandModelId : settings.model;
  const activeShortName = getModelShortName(activeModelId);

  const brandModels = BRAND_VISION_MODEL_IDS.map((id) => AVAILABLE_MODELS.find((m) => m.id === id)).filter(Boolean) as Array<
    (typeof AVAILABLE_MODELS)[number]
  >;

  const listModels = chatMode === 'brand' ? brandModels : AVAILABLE_MODELS;
  const onSelectModel = (modelId: string) => {
    if (chatMode === 'brand') {
      onUpdateSettings({ brandModel: modelId });
      onClose();
      return;
    }
    onUpdateSettings({ model: modelId });
    onClose();
  };

  const desktopWidth = 320;
  const margin = 12;
  const desktopTop = anchorRect ? Math.round(anchorRect.bottom + 10) : 88;
  const desktopLeft = (() => {
    if (typeof window === 'undefined') return margin;
    const vw = window.innerWidth;
    const base = anchorRect ? anchorRect.left : (vw - desktopWidth) / 2;
    return Math.round(Math.min(Math.max(margin, base), vw - desktopWidth - margin));
  })();

  if (isDesktopDropdown) {
    return (
      <div className="fixed inset-0 z-[120] pointer-events-none">
        <div
          ref={panelRef}
          onMouseLeave={onClose}
          className="pointer-events-auto fixed overflow-hidden bg-white/95 dark:bg-[#0f172a]/95 border border-white/60 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_70px_-10px_rgba(0,0,0,0.6)] rounded-3xl animate-in fade-in zoom-in-95"
          style={{ top: desktopTop, left: desktopLeft, width: desktopWidth, maxHeight: 'min(70vh, 34rem)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-white/10">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-white tracking-tight">Model</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                Active: <span className="font-semibold text-primary">{activeShortName || activeModelId}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="rounded-2xl bg-black/5 dark:bg-white/10 p-1 border border-white/10 shadow-inner flex">
              <button
                type="button"
                onClick={() => onChatModeChange('chat')}
                className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${chatMode === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => onChatModeChange('brand')}
                className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${chatMode === 'brand'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                Brand
              </button>
            </div>
          </div>

          <div className="px-2 pb-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(min(70vh, 34rem) - 6.25rem)' }}>
            <div className="grid grid-cols-1 gap-1 px-1">
              {listModels.map((m) => {
                const selected = m.id === activeModelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectModel(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${selected
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[13px] font-black truncate">{m.shortName}</div>
                        {m.badge && (
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-300 truncate">{m.id}</div>
                    </div>
                    {selected && (
                      <div className="shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-primary font-black text-[11px]">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile && anchorRect) {
    const top = Math.round(anchorRect.bottom + 8);
    return (
      <div className="fixed inset-0 z-[120]">
        <div className="absolute inset-0" onClick={onClose} />
        <div
          ref={panelRef}
          className="fixed left-3 right-3 overflow-hidden bg-white/95 dark:bg-[#0f172a]/95 border border-white/60 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_70px_-10px_rgba(0,0,0,0.6)] rounded-3xl animate-in fade-in zoom-in-95 slide-in-from-top-2 flex flex-col"
          style={{ top, maxHeight: 'min(65vh, 30rem)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-white/10">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-white tracking-tight">Model</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                Active: <span className="font-semibold text-primary">{activeShortName || activeModelId}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="rounded-2xl bg-black/5 dark:bg-white/10 p-1 border border-white/10 shadow-inner flex">
              <button
                type="button"
                onClick={() => onChatModeChange('chat')}
                className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${chatMode === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => onChatModeChange('brand')}
                className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${chatMode === 'brand'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                Brand
              </button>
            </div>
          </div>

          <div className="px-2 pb-3 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 gap-1 px-1">
              {listModels.map((m) => {
                const selected = m.id === activeModelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectModel(m.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${selected
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[12px] font-black truncate">{m.shortName}</div>
                        {m.badge && (
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <div className="hidden min-[420px]:block text-[10px] text-slate-500 dark:text-slate-300 truncate">{m.id}</div>
                    </div>
                    {selected && (
                      <div className="shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-primary font-black text-[11px]">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-[130] left-0 right-0 bottom-0 sm:bottom-auto sm:top-24 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-[min(26rem,calc(100vw-1.5rem))] max-h-[82vh] overflow-hidden bg-white/95 dark:bg-[#0f172a]/95 border border-white/60 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_70px_-10px_rgba(0,0,0,0.6)] rounded-t-3xl sm:rounded-3xl animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-top-2">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-900 dark:text-white tracking-tight">Select model</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
              Active: <span className="font-semibold text-primary">{activeShortName || activeModelId}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="rounded-2xl bg-black/5 dark:bg-white/10 p-1 border border-white/10 shadow-inner flex">
            <button
              type="button"
              onClick={() => onChatModeChange('chat')}
              className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${chatMode === 'chat'
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => onChatModeChange('brand')}
              className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${chatMode === 'brand'
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              Brand (Vision)
            </button>
          </div>
        </div>

        <div className="px-2 pb-4 overflow-y-auto max-h-[calc(82vh-7.75rem)] custom-scrollbar">
          <div className="grid grid-cols-1 gap-1 px-2">
            {listModels.map((m) => {
              const selected = m.id === activeModelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectModel(m.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${selected
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-[13px] font-black truncate">{m.shortName}</div>
                      {m.badge && (
                        <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-300 truncate">{m.id}</div>
                  </div>
                  {selected && (
                    <div className="shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-primary font-black text-[11px]">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
