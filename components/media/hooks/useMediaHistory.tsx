import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { MediaItem } from '../../../types';
import { summarizePrompt } from '../../../utils/stringUtils';
import { SupabaseService } from '../../../services/supabase';

export const useMediaHistory = ({
  isAuthenticated,
  userId,
  supabaseService,
}: {
  isAuthenticated: boolean;
  userId?: string | null;
  supabaseService: SupabaseService;
}) => {
  const [mediaHistory, setMediaHistory] = useState<MediaItem[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setMediaHistory([]);
      return;
    }

    const loadGallery = async () => {
      try {
        const items = await supabaseService.getMediaHistoryByUser(userId);
        if (items.length > 0) {
          setMediaHistory(items.sort((a, b) => b.createdAt - a.createdAt));
        }
      } catch (error) {
        console.error('[MediaStudio] Failed to load media history from Supabase:', error);
      }
    };
    void loadGallery();
  }, [isAuthenticated, userId, supabaseService]);

  const toggleIdSelection = useCallback((id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((v) => !v);
    setSelectedIds(new Set());
  }, []);

  const cancelSelection = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const addToHistory = useCallback(async (blob: Blob, type: 'image' | 'video', prompt: string): Promise<MediaItem> => {
    const url = URL.createObjectURL(blob);
    const shortTitle = summarizePrompt(prompt);
    const currentSessionId = localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id');

    const newItem: MediaItem = {
      id: crypto.randomUUID(),
      type,
      url,
      prompt,
      title: shortTitle,
      createdAt: Date.now(),
      sessionId: currentSessionId || undefined
    };

    setMediaHistory(prev => [newItem, ...prev]);

    if (userId && currentSessionId) {
      try {
        await supabaseService.saveMediaItem(newItem, blob, currentSessionId, userId);
      } catch (error) {
        console.error('[MediaStudio] Failed to save media to Supabase:', error);
      }
    }

    return newItem;
  }, [supabaseService, userId]);

  const deleteMedia = useCallback(async (item: MediaItem) => {
    if (!confirm("Are you sure you want to delete this?")) return;

    setMediaHistory(prev => prev.filter(p => p.id !== item.id));
    setSelectedMediaItem(null);

    if (selectedIds.has(item.id)) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }

    if (userId) {
      const currentSessionId = item.sessionId || localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id');
      if (currentSessionId) {
        await supabaseService.deleteMediaItem(item, currentSessionId, userId);
      }
    }
  }, [selectedIds, supabaseService, userId]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;

    const itemsToDelete = mediaHistory.filter(item => selectedIds.has(item.id));

    setMediaHistory(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);

    if (userId) {
      try {
        await supabaseService.deleteMediaItems(itemsToDelete, userId);
      } catch (e) {
        console.error("Bulk delete failure", e);
      }
    }
  }, [mediaHistory, selectedIds, supabaseService, userId]);

  const updateMediaTitle = useCallback(async (itemId: string, newTitle: string) => {
    const title = newTitle.trim();
    if (!title) return;

    setMediaHistory(prev => prev.map(item =>
      item.id === itemId ? { ...item, title } : item
    ));
    setSelectedMediaItem(prev => prev ? (prev.id === itemId ? { ...prev, title } : prev) : null);

    if (userId) {
      try {
        await supabaseService.updateMediaItemTitle(itemId, title);
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    }
  }, [supabaseService, userId]);

  return {
    mediaHistory,
    galleryFilter,
    setGalleryFilter,
    selectedMediaItem,
    setSelectedMediaItem,
    isSelectMode,
    selectedIds,
    toggleIdSelection,
    toggleSelectMode,
    cancelSelection,
    addToHistory,
    deleteMedia,
    bulkDelete,
    updateMediaTitle,
  };
};
