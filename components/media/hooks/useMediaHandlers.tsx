import { useCallback } from 'react';
import { AVAILABLE_EDIT_MODELS, AVAILABLE_IMAGE_MODELS, AVAILABLE_VIDEO_MODELS, ImageAspectRatio, Ltx2AdvancedSettings, MediaItem, MuseTalkLipSyncRequest } from '../../../types';
import type { ChutesService } from '../../../services/chutes';

export const useMediaHandlers = ({
  chutesService,
  addToHistory,
  deductCredits,
  startGeneration,
  updateGenStatus,
  convertUrlToBase64,
  extractFrameFromVideo,
  imagePrompt,
  selectedImageModel,
  customImageModelUrl,
  imageAspectRatio,
  setGeneratedImageUrl,
  setGeneratedImageItem,
  editPrompt,
  editSourceImage,
  editAspectRatio,
  setEditedImageUrl,
  setEditedImageItem,
  videoPrompt,
  videoMode,
  sourceImage,
  selectedVideoModel,
  ltx2Settings,
  ltx2VideoUrl,
  ltx2KeyframeStart,
  ltx2KeyframeEnd,
  setGeneratedVideoUrl,
  setGeneratedVideoItem,
  generatedVideoUrl,
  setEditSourceImage,
  setSourceImage,
  setVideoMode,
  setVideoTool,
  setActiveTab,
  setIsCaptureModalOpen,
  setSelectedMediaItem,
  setCapturedFrame,
  setEditPrompt,
  setLipsyncVideoInput,
  setLipsyncVideoPreviewKind,
  setLipsyncVideoPreviewUrl,
  setLipsyncVideoUrl,
}: {
  chutesService: ChutesService;
  addToHistory: (blob: Blob, type: 'image' | 'video', prompt: string) => Promise<MediaItem>;
  deductCredits: (type: 'image' | 'edit' | 'video', modelOverride?: string) => Promise<boolean>;
  startGeneration: (type: 'image' | 'edit' | 'video') => AbortSignal;
  updateGenStatus: (type: 'image' | 'edit' | 'video', updates: { isGenerating?: boolean; progress?: number; error?: string | null }) => void;
  convertUrlToBase64: (url: string) => Promise<string>;
  extractFrameFromVideo: (videoUrl: string, timeOffset?: number) => Promise<string>;
  imagePrompt: string;
  selectedImageModel: string;
  customImageModelUrl: string;
  imageAspectRatio: ImageAspectRatio;
  setGeneratedImageUrl: (v: string | null) => void;
  setGeneratedImageItem: (v: MediaItem | null) => void;
  editPrompt: string;
  editSourceImage: string | null;
  editAspectRatio: ImageAspectRatio;
  setEditedImageUrl: (v: string | null) => void;
  setEditedImageItem: (v: MediaItem | null) => void;
  videoPrompt: string;
  videoMode: 'i2v' | 't2v';
  sourceImage: string | null;
  selectedVideoModel: string;
  ltx2Settings: Ltx2AdvancedSettings;
  ltx2VideoUrl: string;
  ltx2KeyframeStart: string | null;
  ltx2KeyframeEnd: string | null;
  setGeneratedVideoUrl: (v: string | null) => void;
  setGeneratedVideoItem: (v: MediaItem | null) => void;
  generatedVideoUrl: string | null;
  setEditSourceImage: (v: string | null) => void;
  setSourceImage: (v: string | null) => void;
  setVideoMode: (v: 'i2v' | 't2v') => void;
  setVideoTool: (v: 'animate' | 'lipsync') => void;
  setActiveTab: (v: 'image' | 'edit' | 'video' | 'gallery') => void;
  setIsCaptureModalOpen: (v: boolean) => void;
  setSelectedMediaItem: (v: MediaItem | null) => void;
  setCapturedFrame: (v: string | null) => void;
  setEditPrompt: (v: string) => void;
  setLipsyncVideoInput: (v: string) => void;
  setLipsyncVideoPreviewKind: (v: 'video' | null) => void;
  setLipsyncVideoPreviewUrl: (v: string | null) => void;
  setLipsyncVideoUrl: (v: string) => void;
}) => {
  const handleImageGeneration = useCallback(async () => {
    if (!imagePrompt) return;

    if (!await deductCredits('image')) {
      alert('Insufficient credits. Please add more credits to continue.');
      return;
    }

    const signal = startGeneration('image');
    setGeneratedImageUrl(null);
    setGeneratedImageItem(null);

    try {
      let modelUrl = '';
      let modelId: string | undefined = selectedImageModel;

      if (selectedImageModel === 'custom') {
        if (!customImageModelUrl) throw new Error("Please enter a custom model URL");
        modelUrl = customImageModelUrl;
        modelId = undefined;
      } else {
        const model = AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel);
        if (model) modelUrl = model.url;
      }

      const rawBlob = await chutesService.generateImage({
        prompt: imagePrompt,
        modelUrl,
        modelId,
        aspectRatio: imageAspectRatio
      }, signal);

      const item = await addToHistory(rawBlob, 'image', imagePrompt);
      setGeneratedImageUrl(item.url);
      setGeneratedImageItem(item);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        updateGenStatus('image', { error: err?.message || 'Image generation failed' });
        // Refund credits on failure
        try { await supabaseService.refundCredits?.(userId, getCreditCost('image', selectedImageModel)); } catch {}
      }
    } finally {
      if (!signal.aborted) updateGenStatus('image', { isGenerating: false, progress: 100 });
    }
  }, [
    addToHistory,
    chutesService,
    customImageModelUrl,
    deductCredits,
    imageAspectRatio,
    imagePrompt,
    selectedImageModel,
    setGeneratedImageItem,
    setGeneratedImageUrl,
    startGeneration,
    updateGenStatus,
  ]);

  const handleEditGeneration = useCallback(async () => {
    if (!editPrompt || !editSourceImage) return;

    if (!await deductCredits('edit')) {
      alert('Insufficient credits. Please add more credits to continue.');
      return;
    }

    const signal = startGeneration('edit');
    setEditedImageUrl(null);
    setEditedImageItem(null);

    try {
      const modelUrl = AVAILABLE_EDIT_MODELS[0].url;
      const rawBlob = await chutesService.editImage({
        prompt: editPrompt,
        image_b64: editSourceImage,
        modelUrl,
        aspectRatio: editAspectRatio
      }, signal);

      const item = await addToHistory(rawBlob, 'image', editPrompt + " (Edited)");
      setEditedImageUrl(item.url);
      setEditedImageItem(item);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        updateGenStatus('edit', { error: err?.message || 'Edit failed' });
        // Refund credits on failure
        try { await supabaseService.refundCredits?.(userId, getCreditCost('edit')); } catch {}
      }
    } finally {
      if (!signal.aborted) updateGenStatus('edit', { isGenerating: false, progress: 100 });
    }
  }, [
    addToHistory,
    chutesService,
    deductCredits,
    editAspectRatio,
    editPrompt,
    editSourceImage,
    setEditedImageItem,
    setEditedImageUrl,
    startGeneration,
    updateGenStatus,
  ]);

  const handleVideoGeneration = useCallback(async () => {
    if (!videoPrompt) return;
    if (videoMode === 'i2v' && !sourceImage) return;

    if (!await deductCredits('video')) {
      alert('Insufficient credits. Please add more credits to continue.');
      return;
    }

    const signal = startGeneration('video');
    setGeneratedVideoUrl(null);
    setGeneratedVideoItem(null);

    try {
      const model = AVAILABLE_VIDEO_MODELS.find(m => m.id === selectedVideoModel);
      if (!model) throw new Error("Selected video model not found");
      const modelUrl = model.url;

      const blob = await chutesService.generateVideo({
        prompt: videoPrompt,
        image: videoMode === 'i2v' ? sourceImage! : undefined,
        modelUrl,
        modelId: selectedVideoModel,
        ltx2Params: model.id.includes('ltx-2') ? {
          settings: ltx2Settings,
          videoUrl: ltx2VideoUrl,
          keyframeStart: ltx2KeyframeStart,
          keyframeEnd: ltx2KeyframeEnd
        } : undefined
      }, signal);

      const item = await addToHistory(blob, 'video', videoPrompt);
      setGeneratedVideoUrl(item.url);
      setGeneratedVideoItem(item);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        updateGenStatus('video', { error: err?.message || 'Video generation failed' });
        // Refund credits on failure
        try { await supabaseService.refundCredits?.(userId, getCreditCost('video', selectedVideoModel)); } catch {}
      }
    } finally {
      if (!signal.aborted) updateGenStatus('video', { isGenerating: false, progress: 100 });
    }
  }, [
    addToHistory,
    chutesService,
    deductCredits,
    ltx2KeyframeEnd,
    ltx2KeyframeStart,
    ltx2Settings,
    ltx2VideoUrl,
    selectedVideoModel,
    setGeneratedVideoItem,
    setGeneratedVideoUrl,
    sourceImage,
    startGeneration,
    updateGenStatus,
    videoMode,
    videoPrompt,
  ]);

  const handleLipSyncGeneration = useCallback(async (request: MuseTalkLipSyncRequest) => {
    if (!request.video_input?.trim() || !request.audio_input?.trim()) return;

    if (!await deductCredits('video', 'musetalk')) {
      alert('Insufficient credits. Please add more credits to continue.');
      return;
    }

    const signal = startGeneration('video');
    setGeneratedVideoUrl(null);
    setGeneratedVideoItem(null);

    try {
      const blob = await chutesService.generateLipSync(request, signal);

      const descParts = [
        `fps=${request.fps ?? 25}`,
        `batch=${request.batch_size ?? 8}`,
        `mode=${request.parsing_mode ?? 'jaw'}`
      ];

      const item = await addToHistory(blob, 'video', `Lip Sync (${descParts.join(', ')})`);
      setGeneratedVideoUrl(item.url);
      setGeneratedVideoItem(item);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        updateGenStatus('video', { error: err?.message || 'Lip sync failed' });
        // Refund credits on failure
        try { await supabaseService.refundCredits?.(userId, getCreditCost('video', 'musetalk')); } catch {}
      }
    } finally {
      if (!signal.aborted) updateGenStatus('video', { isGenerating: false, progress: 100 });
    }
  }, [
    addToHistory,
    chutesService,
    deductCredits,
    setGeneratedVideoItem,
    setGeneratedVideoUrl,
    startGeneration,
    updateGenStatus,
  ]);

  const setLipSyncVideoPreview = useCallback((kind: 'video' | null, url: string | null) => {
    setLipsyncVideoPreviewKind(kind);
    setLipsyncVideoPreviewUrl(url);
  }, [setLipsyncVideoPreviewKind, setLipsyncVideoPreviewUrl]);

  const transferToEdit = useCallback(async (imageUrl: string | null, isBase64: boolean = false) => {
    if (!imageUrl) return;
    try {
      const b64 = isBase64 ? imageUrl : await convertUrlToBase64(imageUrl);
      setEditSourceImage(b64);
      setActiveTab('edit');
      updateGenStatus('edit', { error: null });
      setIsCaptureModalOpen(false);
      setSelectedMediaItem(null);
    } catch (e) {
      void e;
      updateGenStatus('edit', { error: "Failed to load image for editing." });
    }
  }, [
    convertUrlToBase64,
    setActiveTab,
    setEditSourceImage,
    setIsCaptureModalOpen,
    setSelectedMediaItem,
    updateGenStatus,
  ]);

  const transferToVideo = useCallback(async (imageUrl: string | null, isBase64: boolean = false) => {
    if (!imageUrl) return;
    try {
      const b64 = isBase64 ? imageUrl : await convertUrlToBase64(imageUrl);
      setSourceImage(b64);
      setVideoMode('i2v');
      setVideoTool('animate');
      setActiveTab('video');
      updateGenStatus('video', { error: null });
      setIsCaptureModalOpen(false);
      setSelectedMediaItem(null);
    } catch (e) {
      void e;
      updateGenStatus('video', { error: "Failed to load image for animation." });
    }
  }, [
    convertUrlToBase64,
    setActiveTab,
    setIsCaptureModalOpen,
    setSelectedMediaItem,
    setSourceImage,
    setVideoMode,
    setVideoTool,
    updateGenStatus,
  ]);

  const transferToLipSyncFromVideo = useCallback(async (videoUrl: string) => {
    try {
      const input = /^https?:\/\//i.test(videoUrl) ? videoUrl : await convertUrlToBase64(videoUrl);
      setVideoTool('lipsync');
      setActiveTab('video');
      setLipsyncVideoInput(input);
      setLipSyncVideoPreview('video', input);
      setLipsyncVideoUrl('');
      updateGenStatus('video', { error: null });
    } catch (e) {
      void e;
      updateGenStatus('video', { error: "Failed to load video for lip sync." });
    }
  }, [
    convertUrlToBase64,
    setActiveTab,
    setLipSyncVideoPreview,
    setLipsyncVideoInput,
    setLipsyncVideoUrl,
    setVideoTool,
    updateGenStatus,
  ]);

  const handleUsePreviewVideoForLipSync = useCallback(async () => {
    if (!generatedVideoUrl) return;
    try {
      await transferToLipSyncFromVideo(generatedVideoUrl);
    } catch (e) {
      void e;
      updateGenStatus('video', { error: "Failed to load preview video for lip sync." });
    }
  }, [generatedVideoUrl, transferToLipSyncFromVideo, updateGenStatus]);

  const handleExtendVideo = useCallback(async () => {
    if (!generatedVideoUrl) return;
    updateGenStatus('video', { error: null });

    try {
      const lastFrame = await extractFrameFromVideo(generatedVideoUrl);
      setCapturedFrame(lastFrame);
      setIsCaptureModalOpen(true);
    } catch (e) {
      void e;
      updateGenStatus('video', { error: "Could not extract last frame from video." });
    }
  }, [
    extractFrameFromVideo,
    generatedVideoUrl,
    setCapturedFrame,
    setIsCaptureModalOpen,
    updateGenStatus,
  ]);

  const applyQuickEdit = useCallback((prompt: string) => {
    setEditPrompt(prompt);
  }, [setEditPrompt]);

  return {
    handleImageGeneration,
    handleEditGeneration,
    handleVideoGeneration,
    handleLipSyncGeneration,
    setLipSyncVideoPreview,
    transferToEdit,
    transferToVideo,
    transferToLipSyncFromVideo,
    handleUsePreviewVideoForLipSync,
    handleExtendVideo,
    applyQuickEdit,
  };
};

