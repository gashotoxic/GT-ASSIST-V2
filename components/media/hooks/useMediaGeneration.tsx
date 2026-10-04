import { useCallback, useEffect, useRef, useState } from 'react';

export type MediaGenType = 'image' | 'edit' | 'video';

export type MediaGenerationState = {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  /** Transient status hint (e.g. a retry notice) shown alongside progress. */
  status: string | null;
};

const DEFAULT_STATUS: Record<MediaGenType, MediaGenerationState> = {
  image: { isGenerating: false, progress: 0, error: null, status: null },
  edit: { isGenerating: false, progress: 0, error: null, status: null },
  video: { isGenerating: false, progress: 0, error: null, status: null },
};

export const useMediaGeneration = () => {
  const [genStatus, setGenStatus] = useState<Record<MediaGenType, MediaGenerationState>>(DEFAULT_STATUS);

  const abortControllers = useRef<Record<MediaGenType, AbortController | null>>({
    image: null,
    edit: null,
    video: null,
  });

  const updateGenStatus = useCallback((type: MediaGenType, updates: Partial<MediaGenerationState>) => {
    setGenStatus(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  }, []);

  const cancelGeneration = useCallback((type: MediaGenType) => {
    if (abortControllers.current[type]) {
      abortControllers.current[type]?.abort();
      abortControllers.current[type] = null;
      updateGenStatus(type, { isGenerating: false, error: "Cancelled by user" });
    }
  }, [updateGenStatus]);

  const startGeneration = useCallback((type: MediaGenType) => {
    if (abortControllers.current[type]) abortControllers.current[type]?.abort();
    abortControllers.current[type] = new AbortController();

    updateGenStatus(type, { isGenerating: true, progress: 0, error: null, status: null });

    return abortControllers.current[type]!.signal;
  }, [updateGenStatus]);

  useEffect(() => {
    const intervalIds: Partial<Record<MediaGenType, number>> = {};

    (['image', 'edit', 'video'] as const).forEach(type => {
      if (genStatus[type].isGenerating) {
        const duration = type === 'video' ? 60000 : (type === 'edit' ? 15000 : 8000);
        const step = 100 / (duration / 100);

        intervalIds[type] = window.setInterval(() => {
          setGenStatus(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              progress: Math.min(95, prev[type].progress + step)
            }
          }));
        }, 100);
      }
    });

    return () => {
      Object.values(intervalIds).forEach(id => {
        if (typeof id === 'number') window.clearInterval(id);
      });
    };
  }, [genStatus.image.isGenerating, genStatus.edit.isGenerating, genStatus.video.isGenerating]);

  useEffect(() => {
    return () => {
      (['image', 'edit', 'video'] as const).forEach(type => {
        abortControllers.current[type]?.abort();
        abortControllers.current[type] = null;
      });
    };
  }, []);

  return {
    genStatus,
    updateGenStatus,
    startGeneration,
    cancelGeneration,
  };
};

