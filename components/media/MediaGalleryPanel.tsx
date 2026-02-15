import React from 'react';
import { Check, Filter, Grid, Image, Trash2, Video } from 'lucide-react';
import { Button } from '../UI';
import { MediaItem } from '../../types';

export const MediaGalleryPanel: React.FC<{
  filteredHistory: MediaItem[];
  galleryFilter: 'all' | 'image' | 'video';
  setGalleryFilter: (f: 'all' | 'image' | 'video') => void;
  isSelectMode: boolean;
  toggleSelectMode: () => void;
  selectedIds: Set<string>;
  toggleIdSelection: (id: string) => void;
  openItem: (item: MediaItem) => void;
  bulkDelete: () => void;
  cancelSelection: () => void;
}> = ({
  filteredHistory,
  galleryFilter,
  setGalleryFilter,
  isSelectMode,
  toggleSelectMode,
  selectedIds,
  toggleIdSelection,
  openItem,
  bulkDelete,
  cancelSelection,
}) => {
  return (
    <div className="animate-in slide-in-from-bottom-4 flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Grid className="w-5 h-5 text-primary" />
          Media History
        </h3>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectMode}
            className={`h-8 text-xs font-semibold ${isSelectMode ? 'bg-primary/10 text-primary' : 'text-gray-500'}`}
          >
            {isSelectMode ? 'Cancel Selection' : 'Select'}
          </Button>
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/10">
            {(['all', 'image', 'video'] as const).map(f => (
              <button
                key={f}
                onClick={() => setGalleryFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${galleryFilter === f
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 opacity-50">
          <Filter className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-500">No media found</p>
          <p className="text-sm text-gray-400">Try changing filters or generate something new.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {filteredHistory.map(item => (
            <div
              key={item.id}
              onClick={() => isSelectMode ? toggleIdSelection(item.id) : openItem(item)}
              className={`group relative rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 aspect-square shadow-sm hover:shadow-lg transition-all border-2 cursor-pointer 
                ${selectedIds.has(item.id) ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/30'}
              `}
            >
              {isSelectMode && (
                <div
                  className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-md ${selectedIds.has(item.id) ? 'bg-primary border-primary text-white scale-110' : 'bg-black/20 border-white/50 text-transparent'
                    }`}
                >
                  {selectedIds.has(item.id) && <Check className="w-4 h-4" />}
                </div>
              )}
              {item.type === 'video' ? (
                <>
                  <video src={item.url} className="w-full h-full object-contain pointer-events-none bg-black/30" />
                  <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md backdrop-blur-sm z-10">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                </>
              ) : (
                <>
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-contain bg-black/10 dark:bg-black/30" loading="lazy" />
                  <div className="absolute top-2 right-2 bg-black/40 text-white p-1 rounded-md backdrop-blur-sm z-10">
                    <Image className="w-3.5 h-3.5" />
                  </div>
                </>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-xs text-white line-clamp-2 mb-2 font-medium">{item.title || item.prompt}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300 uppercase font-bold flex items-center gap-1">
                    {item.type === 'video' ? 'Video' : 'Image'}
                  </span>
                  <div className="text-[10px] text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                    Click to view
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSelectMode && selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300 w-full max-w-sm px-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 backdrop-blur-xl">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{selectedIds.size} Selected</span>
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Media</span>
            </div>
            <div className="h-8 w-px bg-white/10 shrink-0"></div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDelete}
                className="h-9 px-3 rounded-xl flex items-center gap-2 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden xs:inline">Delete</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelSelection}
                className="h-9 px-3 rounded-xl text-white hover:bg-white/10 shrink-0"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

