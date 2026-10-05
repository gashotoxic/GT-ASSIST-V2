
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image, Film, Loader2, Wand2, Upload, AlertCircle, Play, Scissors, ArrowRight, Video, XCircle, Camera, X, Check, Grid, Filter, Type, FileImage, Trash2, Layers } from 'lucide-react';
import { Button, Input, Textarea, Select, Label } from './UI';
import { AVAILABLE_VIDEO_MODELS, AppSettings, MediaItem, ImageAspectRatio, Ltx25AdvancedSettings } from '../types';
import { getCreditCost } from '../services/creditCosts';
import { useCredits } from '../context/CreditContext';
import { useServices } from '../context/ServicesContext';
import { VideoAnimatorPanel } from './media/VideoAnimatorPanel';
import { LipSyncPanel } from './media/LipSyncPanel';
import { MediaPickerModal } from './media/MediaPickerModal';
import { MediaGalleryPanel } from './media/MediaGalleryPanel';
import { MediaImageControls } from './media/MediaImageControls';
import { MediaEditControls } from './media/MediaEditControls';
import { MediaVideoToolToggle } from './media/MediaVideoToolToggle';
import { MediaPreviewContent } from './media/MediaPreviewContent';
import { MediaFooterActions } from './media/MediaFooterActions';
import { MediaLightbox } from './media/MediaLightbox';
import { MediaCaptureFrameModal } from './media/MediaCaptureFrameModal';
import { useMediaHistory } from './media/hooks/useMediaHistory';
import { useMediaGeneration } from './media/hooks/useMediaGeneration';
import { useMediaHandlers } from './media/hooks/useMediaHandlers';
import { PhotoshopEditor } from './photoshop/PhotoshopEditor';

interface MediaStudioProps {
    settings: AppSettings;
    isAuthenticated: boolean;
    onRequestAuth: () => void;
    userId?: string | null;
    onTabChange?: (tab: string) => void;
}

// Simulated Progress Component
const Progress: React.FC<{ value: number }> = ({ value }) => (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
        <div
            className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

type GenType = 'image' | 'edit' | 'video';

const MediaStudio: React.FC<MediaStudioProps> = ({ settings, isAuthenticated, onRequestAuth, userId, onTabChange }) => {
    const [activeTab, setActiveTab] = useState<GenType | 'gallery' | 'photoshop'>('image');
    const { refetch, credits, dailyCredits, subscriptionTier, canAfford } = useCredits();

    // Notify parent when tab changes
    useEffect(() => {
        if (onTabChange && activeTab !== 'gallery') {
            onTabChange(activeTab);
        }
    }, [activeTab, onTabChange]);

    const { genStatus, updateGenStatus, startGeneration, cancelGeneration } = useMediaGeneration();
    const handleCancel = (type: GenType) => cancelGeneration(type);

    // Image Gen State
    const [imagePrompt, setImagePrompt] = useState('');
    const [selectedImageModel, setSelectedImageModel] = useState('qwen-image-2.5-12b');
    const [customImageModelUrl, setCustomImageModelUrl] = useState('');
    const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [generatedImageItem, setGeneratedImageItem] = useState<MediaItem | null>(null);

    // Image Edit State
    const [editPrompt, setEditPrompt] = useState('');
    const [editMode, setEditMode] = useState<'smart' | 'remove_bg' | 'upscale' | 'style_transfer'>('smart');
    const [stylePreset, setStylePreset] = useState('cyberpunk');
    const [editHistory, setEditHistory] = useState<string[]>([]);
    const [showBeforeAfter, setShowBeforeAfter] = useState(false);
    const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
    const [editAspectRatio, setEditAspectRatio] = useState<ImageAspectRatio>('1:1');
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [editedImageItem, setEditedImageItem] = useState<MediaItem | null>(null);

    // Video Gen State
    const [videoTool, setVideoTool] = useState<'animate' | 'lipsync'>('animate');
    const [videoMode, setVideoMode] = useState<'i2v' | 't2v'>('i2v');
    const [selectedVideoModel, setSelectedVideoModel] = useState(AVAILABLE_VIDEO_MODELS.find(m => m.type === 'i2v')?.id || AVAILABLE_VIDEO_MODELS[0].id);
    const [videoPrompt, setVideoPrompt] = useState('');
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [generatedVideoItem, setGeneratedVideoItem] = useState<MediaItem | null>(null);

    const [ltx2VideoUrl, setLtx2VideoUrl] = useState('');
    const [ltx2KeyframeStart, setLtx2KeyframeStart] = useState<string | null>(null);
    const [ltx2KeyframeEnd, setLtx2KeyframeEnd] = useState<string | null>(null);

    // LTX-2.5 State
    const [ltx25Settings, setLtx25Settings] = useState<Ltx25AdvancedSettings>({
        width: 768,
        height: 512,
        fps: 24,
        num_frames: null,
        duration: null,
        seed: null,
        use_random_seed: true,
        enhance_prompt: true,
        generate_audio: true,
        auto_duration: true,
        auto_duration_min_seconds: 3,
        auto_duration_max_seconds: 10,
        generated_keyframes: null,
        stage_1_sigmas: [1.0, 0.9999, 0.9995, 0.999, 0.998, 0.994, 0.978, 0.0],
        stage_2_sigmas: [0.599, 0.368, 0.0],
        json_override: ''
    });

    // Lip Sync State
    const [lipsyncVideoInput, setLipsyncVideoInput] = useState('');
    const [lipsyncAudioInput, setLipsyncAudioInput] = useState('');
    const [lipsyncVideoPreviewUrl, setLipsyncVideoPreviewUrl] = useState<string | null>(null);
    const [lipsyncVideoPreviewKind, setLipsyncVideoPreviewKind] = useState<'video' | null>(null);
    const [lipsyncAudioPreviewUrl, setLipsyncAudioPreviewUrl] = useState<string | null>(null);
    const [lipsyncAdvancedOpen, setLipsyncAdvancedOpen] = useState(false);
    const [lipsyncVideoUrl, setLipsyncVideoUrl] = useState('');
    const [lipsyncAudioUrl, setLipsyncAudioUrl] = useState('');
    const [lipsyncFps, setLipsyncFps] = useState(25);
    const [lipsyncBatchSize, setLipsyncBatchSize] = useState(8);
    const [lipsyncExtraMargin, setLipsyncExtraMargin] = useState(10);
    const [lipsyncParsingMode, setLipsyncParsingMode] = useState<'jaw' | 'raw'>('jaw');
    const [lipsyncLeftCheekWidth, setLipsyncLeftCheekWidth] = useState(90);
    const [lipsyncRightCheekWidth, setLipsyncRightCheekWidth] = useState(90);

    // Frame Capture State
    const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);

    // Enhancer State
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Cross-feature Modals
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

    const editInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { supabaseService, chutesService } = useServices();

    const {
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
        deleteMedia: handleDeleteMedia,
        bulkDelete: handleBulkDelete,
        updateMediaTitle: handleUpdateMediaTitle,
    } = useMediaHistory({ isAuthenticated, userId, supabaseService });

    // Phase 5: Photoshop → Media Studio integration
    const handlePhotoshopExportToMedia = useCallback(async (blob: Blob, name: string) => {
        await addToHistory(blob, 'image', name);
        // Switch to gallery tab to show the new item
        setActiveTab('gallery');
    }, [addToHistory]);

    // Media operations use specific costs
    const getMediaCost = (type: 'image' | 'edit' | 'video', model?: string) => {
        return getCreditCost(type, model || '');
    };

    const checkCredits = async (type: 'image' | 'edit' | 'video', requireAuth: boolean = true): Promise<boolean> => {
        if (!isAuthenticated) {
            onRequestAuth();
            return false;
        }
        return true;
    };

    // Deduct credits function - STRICT Supabase usage
    const deductCredits = async (type: 'image' | 'edit' | 'video', modelOverride?: string): Promise<boolean> => {
        const model = modelOverride || (type === 'image' ? selectedImageModel : type === 'video' ? selectedVideoModel : 'qwen-image-edit');
        const cost = getMediaCost(type, model);

        if (userId) {
            try {
                const sessionId = localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id') || '';
                await supabaseService.useCredits(userId, cost, type, model, sessionId);
                refetch();
                return true;
            } catch (error) {
                console.error('Credit deduction failed:', error);
                return false;
            }
        }
        onRequestAuth();
        return false;
    };

    // Handle Video Mode Switching
    useEffect(() => {
        const compatibleModels = AVAILABLE_VIDEO_MODELS.filter(m => m.type === videoMode);
        if (compatibleModels.length > 0) {
            setSelectedVideoModel(compatibleModels[0].id);
        }
    }, [videoMode]);

    // Clean up URL objects to avoid memory leaks
    useEffect(() => {
        return () => {
            if (generatedImageUrl) URL.revokeObjectURL(generatedImageUrl);
            if (editedImageUrl) URL.revokeObjectURL(editedImageUrl);
            if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        };
    }, []);

    // --- HELPERS ---

    const convertUrlToBase64 = async (url: string): Promise<string> => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const extractFrameFromVideo = async (videoUrl: string, timeOffset?: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.crossOrigin = 'anonymous';
            video.muted = true;

            video.onloadedmetadata = () => {
                // If timeOffset is provided, use it. Otherwise go to end.
                const targetTime = timeOffset !== undefined ? timeOffset : Math.max(0, video.duration - 0.1);
                video.currentTime = targetTime;
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl);
                } else {
                    reject(new Error("Failed to create canvas context"));
                }
            };

            video.onerror = (e) => reject(new Error("Error loading video for frame extraction"));
        });
    };

    const handleCaptureCurrentFrame = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setCapturedFrame(dataUrl);
            setIsCaptureModalOpen(true);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen().catch(err => {
                    console.error("Error attempting to enable full-screen mode:", err);
                });
            }
        }
    };

    const handleEnhancePrompt = async (currentPrompt: string, setter: (val: string) => void, options?: { hasImage?: boolean }) => {
        setIsEnhancing(true);
        try {
            const enhanced = await chutesService.enhancePrompt(currentPrompt, options);
            if (enhanced) setter(enhanced);
        } catch (e) {
            console.error("Failed to enhance", e);
        } finally {
            setIsEnhancing(false);
        }
    };

    const {
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
        handleAdvancedEdit,
        handleEditAgain,
        handleUndo,
    } = useMediaHandlers({
        chutesService,
        supabaseService,
        userId,
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
        editedImageUrl,
        videoPrompt,
        videoMode,
        sourceImage,
        selectedVideoModel,
        ltx25Settings,
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
        editMode,
        stylePreset,
        editHistory,
        setEditHistory,
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setter(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const downloadBase64 = (base64Data: string, filename: string) => {
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePickLipSyncFromGallery = () => {
        setIsMediaPickerOpen(true);
    };

    const filteredHistory = mediaHistory.filter(item => {
        if (galleryFilter === 'all') return true;
        return item.type === galleryFilter;
    });

    const lightboxItems =
        selectedMediaItem && filteredHistory.some(i => i.id === selectedMediaItem.id)
            ? filteredHistory
            : mediaHistory;

    return (
        <div className="flex flex-col w-full flex-1 min-h-0 max-w-7xl mx-auto glass-card md:rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in duration-500 ring-1 ring-white/20 dark:ring-white/5 relative border border-white/40 dark:border-white/10">

            {/* Header Tabs */}
            <div className="flex border-b border-gray-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-x-auto shrink-0">
                {[
                    { id: 'image', label: 'Image', icon: Image },
                    { id: 'edit', label: 'Editor', icon: Scissors },
                    { id: 'video', label: 'Animator', icon: Film },
                    { id: 'photoshop', label: 'PS', icon: Layers },
                    { id: 'gallery', label: 'Gallery', icon: Grid }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-0 sm:min-w-[100px] py-3 sm:py-5 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2.5 transition-all relative group overflow-hidden ${activeTab === tab.id
                            ? 'text-primary bg-primary/5 dark:bg-primary/10'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/10 dark:hover:bg-white/5'
                            }`}
                    >
                        <div className="relative">
                            <tab.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                            {/* Show tiny dot if this tab is generating in background */}
                            {tab.id !== 'gallery' && tab.id !== 'photoshop' && genStatus[tab.id as GenType]?.isGenerating && activeTab !== tab.id && (
                                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-primary animate-pulse border border-white dark:border-slate-900"></span>
                            )}
                        </div>
                        <span className="tracking-wide">{tab.label}</span>
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_#1abc9c]" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar min-h-0">
                {activeTab === 'gallery' || activeTab === 'photoshop' ? activeTab === 'photoshop' ? (
                            <div className="w-full h-full min-h-[500px]">
                                <PhotoshopEditor
                                    initialImageUrl={generatedImageUrl || editedImageUrl}
                                    onClose={() => setActiveTab('image')}
                                    isAuthenticated={isAuthenticated}
                                    onRequestAuth={onRequestAuth}
                                    userId={userId}
                                    onExportToMedia={handlePhotoshopExportToMedia}
                                />
                            </div>
                        ) : (
                    <MediaGalleryPanel
                        filteredHistory={filteredHistory}
                        galleryFilter={galleryFilter}
                        setGalleryFilter={setGalleryFilter}
                        isSelectMode={isSelectMode}
                        toggleSelectMode={toggleSelectMode}
                        selectedIds={selectedIds}
                        toggleIdSelection={toggleIdSelection}
                        openItem={setSelectedMediaItem}
                        bulkDelete={handleBulkDelete}
                        cancelSelection={cancelSelection}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">

                        {/* Controls Column */}
                        <div className="lg:col-span-4 flex flex-col gap-6 animate-in slide-in-from-left-4 duration-500 delay-100 pb-10 min-h-0">
                            {/* ... (Existing Image/Edit/Video Control Logic - No changes here, kept layout intact) ... */}

                            {/* Image Tab Controls */}
                            {activeTab === 'image' && (
                                <MediaImageControls
                                    selectedImageModel={selectedImageModel}
                                    setSelectedImageModel={setSelectedImageModel}
                                    customImageModelUrl={customImageModelUrl}
                                    setCustomImageModelUrl={setCustomImageModelUrl}
                                    imageAspectRatio={imageAspectRatio}
                                    setImageAspectRatio={setImageAspectRatio}
                                    imagePrompt={imagePrompt}
                                    setImagePrompt={setImagePrompt}
                                    isEnhancing={isEnhancing}
                                    onEnhancePrompt={() => handleEnhancePrompt(imagePrompt, setImagePrompt)}
                                    isAuthenticated={isAuthenticated}
                                    onRequestAuth={onRequestAuth}
                                    onGenerate={handleImageGeneration}
                                    canAfford={canAfford}
                                    genStatus={genStatus.image}
                                    Progress={Progress}
                                />
                            )}

                            {/* Edit Tab Controls */}
                            {activeTab === 'edit' && (
                                <MediaEditControls
                                    editSourceImage={editSourceImage}
                                    setEditSourceImage={setEditSourceImage}
                                    editInputRef={editInputRef}
                                    handleFileUpload={handleFileUpload}
                                    editAspectRatio={editAspectRatio}
                                    setEditAspectRatio={setEditAspectRatio}
                                    editPrompt={editPrompt}
                                    setEditPrompt={setEditPrompt}
                                    editMode={editMode}
                                    setEditMode={setEditMode}
                                    stylePreset={stylePreset}
                                    setStylePreset={setStylePreset}
                                    applyQuickEdit={applyQuickEdit}
                                    isAuthenticated={isAuthenticated}
                                    onRequestAuth={onRequestAuth}
                                    onGenerate={() => {
                                        if (editMode === 'smart') {
                                            handleEditGeneration();
                                        } else {
                                            handleAdvancedEdit(editMode, stylePreset);
                                        }
                                    }}
                                    canAfford={canAfford}
                                    genStatus={genStatus.edit}
                                    Progress={Progress}
                                    downloadBase64={downloadBase64}
                                    editHistory={editHistory}
                                    onEditAgain={handleEditAgain}
                                    onUndo={handleUndo}
                                    onPickFromGallery={() => {
                                        setIsMediaPickerOpen(true);
                                    }}
                                />
                            )}

                            {/* Video Tab Controls */}
                            {activeTab === 'video' && (
                                <div className="space-y-6">
                                    <MediaVideoToolToggle videoTool={videoTool} setVideoTool={setVideoTool} />

                                    {videoTool === 'animate' ? (
                                        <VideoAnimatorPanel
                                            isAuthenticated={isAuthenticated}
                                            onRequestAuth={onRequestAuth}
                                            canAfford={canAfford}
                                            isGenerating={genStatus.video.isGenerating}
                                            videoMode={videoMode}
                                            setVideoMode={setVideoMode}
                                            selectedVideoModel={selectedVideoModel}
                                            setSelectedVideoModel={setSelectedVideoModel}
                                            sourceImage={sourceImage}
                                            setSourceImage={setSourceImage}
                                            videoPrompt={videoPrompt}
                                            setVideoPrompt={setVideoPrompt}
                                            isEnhancing={isEnhancing}
                                            onEnhancePrompt={() => handleEnhancePrompt(videoPrompt, setVideoPrompt, { hasImage: videoMode === 'i2v' && Boolean(sourceImage) })}
                                            onGenerate={handleVideoGeneration}
                                            onDownloadBase64={downloadBase64}
                                            ltx2VideoUrl={ltx2VideoUrl}
                                            setLtx2VideoUrl={setLtx2VideoUrl}
                                            ltx2KeyframeStart={ltx2KeyframeStart}
                                            setLtx2KeyframeStart={setLtx2KeyframeStart}
                                            ltx2KeyframeEnd={ltx2KeyframeEnd}
                                            setLtx2KeyframeEnd={setLtx2KeyframeEnd}
                                            // LTX-2.5 Props
                                            ltx25Settings={ltx25Settings}
                                            setLtx25Settings={setLtx25Settings}
                                            onPickVideoFromGallery={() => {
                                                setIsMediaPickerOpen(true);
                                                // We'll need to know we are picking for LTX-2 video URL, but for now just open picker
                                                // The picker logic needs a bit of tweak or a separate handler if we want to distinguish
                                                // between Lip Sync and LTX-2 video pick.
                                                // For now, let's reuse the picker but we might need a state to track "what are we picking for"
                                            }}
                                        />
                                    ) : (
                                        <LipSyncPanel
                                            isAuthenticated={isAuthenticated}
                                            onRequestAuth={onRequestAuth}
                                            canAfford={canAfford}
                                            isGenerating={genStatus.video.isGenerating}
                                            onPickFromGallery={handlePickLipSyncFromGallery}
                                            onUsePreviewVideo={handleUsePreviewVideoForLipSync}
                                            canUsePreviewVideo={Boolean(generatedVideoUrl)}
                                            videoInput={lipsyncVideoInput}
                                            setVideoInput={setLipsyncVideoInput}
                                            audioInput={lipsyncAudioInput}
                                            setAudioInput={setLipsyncAudioInput}
                                            videoPreviewUrl={lipsyncVideoPreviewUrl}
                                            videoPreviewKind={lipsyncVideoPreviewKind}
                                            setVideoPreview={setLipSyncVideoPreview}
                                            audioPreviewUrl={lipsyncAudioPreviewUrl}
                                            setAudioPreviewUrl={setLipsyncAudioPreviewUrl}
                                            advancedOpen={lipsyncAdvancedOpen}
                                            setAdvancedOpen={setLipsyncAdvancedOpen}
                                            videoUrl={lipsyncVideoUrl}
                                            setVideoUrl={setLipsyncVideoUrl}
                                            audioUrl={lipsyncAudioUrl}
                                            setAudioUrl={setLipsyncAudioUrl}
                                            fps={lipsyncFps}
                                            setFps={setLipsyncFps}
                                            batchSize={lipsyncBatchSize}
                                            setBatchSize={setLipsyncBatchSize}
                                            extraMargin={lipsyncExtraMargin}
                                            setExtraMargin={setLipsyncExtraMargin}
                                            parsingMode={lipsyncParsingMode}
                                            setParsingMode={setLipsyncParsingMode}
                                            leftCheekWidth={lipsyncLeftCheekWidth}
                                            setLeftCheekWidth={setLipsyncLeftCheekWidth}
                                            rightCheekWidth={lipsyncRightCheekWidth}
                                            setRightCheekWidth={setLipsyncRightCheekWidth}
                                            onGenerate={handleLipSyncGeneration}
                                        />
                                    )}
                                    {genStatus.video.isGenerating && <Progress value={genStatus.video.progress} />}
                                </div>
                            )}

                            {/* Global Error & Cancel */}
                            {genStatus[activeTab as GenType]?.isGenerating && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 mt-4">
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                                        <span>Status: {Math.round(genStatus[activeTab as GenType].progress)}%{genStatus[activeTab as GenType].status ? ` · ${genStatus[activeTab as GenType].status}` : ''}</span>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleCancel(activeTab as GenType)}
                                            className="h-7 text-xs rounded-lg bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                                        >
                                            <XCircle className="w-3 h-3 mr-1.5" /> Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {genStatus[activeTab as GenType]?.error && !genStatus[activeTab as GenType]?.isGenerating && (
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span>{genStatus[activeTab as GenType].error}</span>
                                </div>
                            )}
                        </div>

                        {/* Preview Column */}
                        <div className="lg:col-span-8 flex flex-col min-h-0 sm:min-h-[400px] animate-in slide-in-from-right-4 duration-500 delay-200">
                            <div
                                id="tour-media-content"
                                className="flex-1 h-[50svh] xs:h-[55svh] sm:h-auto rounded-2xl border border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md shadow-inner flex items-start sm:items-center justify-center relative overflow-auto overscroll-contain touch-pan-y custom-scrollbar group p-2 min-h-0 sm:min-h-[400px]"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                <MediaPreviewContent
                                    activeTab={activeTab as GenType}
                                    genStatus={genStatus}
                                    generatedImageUrl={generatedImageUrl}
                                    generatedImageItem={generatedImageItem}
                                    editedImageUrl={editedImageUrl}
                                    editedImageItem={editedImageItem}
                                    generatedVideoUrl={generatedVideoUrl}
                                    videoRef={videoRef}
                                    onOpenItem={setSelectedMediaItem}
                                    toggleFullscreen={toggleFullscreen}
                                    handleCaptureCurrentFrame={handleCaptureCurrentFrame}
                                    showBeforeAfter={activeTab === 'edit' && showBeforeAfter}
                                    sourceImageUrl={editHistory.length > 0 ? editHistory[editHistory.length - 1] : null}
                                />
                            </div>

                            <MediaFooterActions
                                activeTab={activeTab as GenType}
                                generatedImageUrl={generatedImageUrl}
                                editedImageUrl={editedImageUrl}
                                generatedVideoUrl={generatedVideoUrl}
                                transferToEdit={transferToEdit}
                                transferToVideo={transferToVideo}
                                handleCaptureCurrentFrame={handleCaptureCurrentFrame}
                                handleExtendVideo={handleExtendVideo}
                                handleUsePreviewVideoForLipSync={handleUsePreviewVideoForLipSync}
                                editHistory={editHistory}
                                onEditAgain={handleEditAgain}
                                onUndo={handleUndo}
                            />
                        </div>
                    </div>
                )}
            </div>

            {selectedMediaItem && (
                <MediaLightbox
                    selectedMediaItem={selectedMediaItem}
                    lightboxItems={lightboxItems}
                    onClose={() => setSelectedMediaItem(null)}
                    onSelectItem={(item) => setSelectedMediaItem(item)}
                    onUpdateTitle={handleUpdateMediaTitle}
                    onDelete={handleDeleteMedia}
                    onTransferToEdit={(url) => transferToEdit(url)}
                    onTransferToVideo={(url) => transferToVideo(url)}
                    onTransferToLipSyncFromVideo={transferToLipSyncFromVideo}
                    onExtendVideoFromUrl={(url) => {
                        setGeneratedVideoUrl(url);
                        setTimeout(() => handleExtendVideo(), 100);
                        setActiveTab('video');
                    }}
                    onCapturedFrame={(dataUrl) => {
                        setCapturedFrame(dataUrl);
                        setIsCaptureModalOpen(true);
                    }}
                    extractFrameFromVideo={extractFrameFromVideo}
                />
            )}

            <MediaCaptureFrameModal
                isOpen={isCaptureModalOpen}
                capturedFrame={capturedFrame}
                onClose={() => setIsCaptureModalOpen(false)}
                onDownload={(frame) => downloadBase64(frame, 'captured-frame.png')}
                onEdit={(frame) => transferToEdit(frame, true)}
                onAnimate={(frame) => transferToVideo(frame, true)}
            />

            <MediaPickerModal
                title="Select from Gallery"
                isOpen={isMediaPickerOpen}
                items={mediaHistory}
                filter={activeTab === 'edit' ? 'all' : 'video'}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={async (item) => {
                    setIsMediaPickerOpen(false);
                    if (activeTab === 'edit') {
                        const url = item.url;
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                setEditSourceImage(reader.result as string);
                            };
                            reader.readAsDataURL(blob);
                        } catch {}
                    } else {
                        await transferToLipSyncFromVideo(item.url);
                    }
                }}
            />

        </div>
    );
};

export default MediaStudio;
