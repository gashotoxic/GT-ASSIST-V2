import React, { useMemo, useState } from 'react';
import { X, Image as ImageIcon, Video as VideoIcon, Search } from 'lucide-react';
import { Button, Input } from '../UI';
import { MediaItem } from '../../types';

export function MediaPickerModal(props: {
  title: string;
  isOpen: boolean;
  items: MediaItem[];
  filter: 'all' | 'image' | 'video';
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.items.filter(item => {
      if (props.filter !== 'all' && item.type !== props.filter) return false;
      if (!q) return true;
      const hay = `${item.title || ''} ${item.prompt || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [props.items, props.filter, query]);

  if (!props.isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-white/30 dark:border-white/10 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/20 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{props.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Click an item to use it</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-72 max-w-[55vw]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title/prompt..." className="pl-9" />
            </div>
            <Button variant="ghost" size="icon" onClick={props.onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400">
              No items found.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => props.onSelect(item)}
                  className="group relative rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 aspect-square shadow-sm hover:shadow-lg transition-all border border-white/30 dark:border-white/10 hover:border-primary/40"
                >
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-contain pointer-events-none bg-black/30" muted playsInline preload="metadata" />
                  ) : (
                    <img src={item.url} alt={item.prompt} className="w-full h-full object-contain bg-black/10 dark:bg-black/30" loading="lazy" />
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-md backdrop-blur-sm">
                    {item.type === 'video' ? <VideoIcon className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-xs text-white line-clamp-2 font-medium">{item.title || item.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

