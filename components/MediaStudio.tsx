
import React, { useState, useRef, useEffect } from 'react';
import { Image, Film, Loader2, Download, Wand2, Upload, AlertCircle, Play, Scissors, ArrowRight, Video, XCircle, Maximize2, Sparkles, Camera, X, Check, Grid, Filter, Type, FileImage, Trash2, Pencil } from 'lucide-react';
import { Button, Input, Textarea, Select, Label } from './UI';
import { ChutesService } from '../services/chutes';
import { SupabaseService } from '../services/supabase';
import { WatermarkService } from '../services/watermark';
import { AVAILABLE_IMAGE_MODELS, AVAILABLE_VIDEO_MODELS, AVAILABLE_EDIT_MODELS, AppSettings, MediaItem } from '../types';

interface MediaStudioProps {
  settings: AppSettings;
  isAuthenticated: boolean;
  onRequestAuth: () => void;
  userId?: string | null;
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

interface GenerationState {
    isGenerating: boolean;
    progress: number;
    error: string | null;
}

const MediaStudio: React.FC<MediaStudioProps> = ({ settings, isAuthenticated, onRequestAuth, userId }) => {
  const [activeTab, setActiveTab] = useState<GenType | 'gallery'>('image');
  
  // Independent state for each tab to allow parallel generation
  const [genStatus, setGenStatus] = useState<Record<GenType, GenerationState>>({
      image: { isGenerating: false, progress: 0, error: null },
      edit: { isGenerating: false, progress: 0, error: null },
      video: { isGenerating: false, progress: 0, error: null },
  });

  // Image Gen State
  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState(AVAILABLE_IMAGE_MODELS[0].id);
  const [customImageModelUrl, setCustomImageModelUrl] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Image Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  // Video Gen State
  const [videoMode, setVideoMode] = useState<'i2v' | 't2v'>('i2v');
  const [selectedVideoModel, setSelectedVideoModel] = useState(AVAILABLE_VIDEO_MODELS.find(m => m.type === 'i2v')?.id || AVAILABLE_VIDEO_MODELS[0].id);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  
  // Frame Capture State
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);

  // Enhancer State
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Gallery State
  const [mediaHistory, setMediaHistory] = useState<MediaItem[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  
  // Separate controllers for each process
  const abortControllers = useRef<Record<GenType, AbortController | null>>({
      image: null,
      edit: null,
      video: null
  });
  
  const chutesService = new ChutesService(settings.apiKey);
  const supabaseService = new SupabaseService(settings);
  
  // Define credit costs for different operations
  const mediaCreditCosts = {
    'image': 2,
    'edit': 3,
    'video': 5
  };
  
  // Check credits function - ALWAYS use Supabase for auth users, no fallbacks
  const checkCredits = async (type: 'image' | 'edit' | 'video', requireAuth: boolean = true): Promise<boolean> => {
    const cost = mediaCreditCosts[type];
    
    if (!isAuthenticated && requireAuth) {
      onRequestAuth();
      return false;
    }
    
    // For authenticated users, ALWAYS use Supabase - NO localStorage fallbacks
    if (isAuthenticated && userId) {
      try {
        const canAfford = await supabaseService.checkCreditAvailability(userId, cost);
        if (!canAfford) {
          alert('Insufficient credits. Please add more credits to continue.');
          return false;
        }
        return true;
      } catch (error) {
        console.error('Credit check failed:', error);
        alert('Unable to check credits. Please try again.');
        return false;
      }
    } else {
      // Guest mode - check guest credits
      const guestCredits = parseInt(localStorage.getItem('chutes_guest_credits') || '10');
      if (guestCredits < cost) {
        alert('You\'ve used your free guest credits. Sign in to get 10 free credits and continue using the service.');
        return false;
      }
      return true;
    }
  };
  
  // Deduct credits function - ALWAYS use Supabase for auth users, no fallbacks
  const deductCredits = async (type: 'image' | 'edit' | 'video'): Promise<boolean> => {
    const cost = mediaCreditCosts[type];
    
    if (isAuthenticated && userId) {
      // Supabase mode for authenticated users - NO fallbacks
      try {
        const sessionId = localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id') || '';
        await supabaseService.useCredits(userId, cost, type, selectedImageModel || selectedVideoModel, sessionId);
        return true;
      } catch (error) {
        console.error('Credit deduction failed:', error);
        return false;
      }
    } else {
      // Guest mode - deduct from guest storage
      const guestCredits = parseInt(localStorage.getItem('chutes_guest_credits') || '10');
      localStorage.setItem('chutes_guest_credits', (guestCredits - cost).toString());
      return true;
    }
  };

  // Load Cloud Gallery on mount - use Supabase for auth users
  useEffect(() => {
    const loadGallery = async () => {
      const currentSessionId = localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id');
      if (!currentSessionId) return;

      // For authenticated users, ALWAYS load from Supabase
      if (isAuthenticated && userId) {
        try {
          const items = await supabaseService.getMediaHistory(currentSessionId);
          if (items.length > 0) {
            setMediaHistory(prev => {
              // Merge to avoid duplicates if local generation happened
              const newIds = new Set(items.map(i => i.id));
              const filteredPrev = prev.filter(p => !newIds.has(p.id));
              return [...items, ...filteredPrev].sort((a,b) => b.createdAt - a.createdAt);
            });
          }
        } catch (error) {
          console.error('Failed to load media history from Supabase:', error);
        }
      }
      // For guests, don't load from Supabase (or load from local if needed)
    };
    loadGallery();
  }, [isAuthenticated, userId]);

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

  // Progress Simulation Effect - Handles multiple intervals
  useEffect(() => {
    const intervalIds: Record<string, any> = {};

    (['image', 'edit', 'video'] as GenType[]).forEach(type => {
        if (genStatus[type].isGenerating) {
            // Estimate durations: Image ~5s, Edit ~10s, Video ~60s
            const duration = type === 'video' ? 60000 : (type === 'edit' ? 15000 : 8000);
            const step = 100 / (duration / 100); 

            intervalIds[type] = setInterval(() => {
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
        Object.values(intervalIds).forEach(id => clearInterval(id));
    };
  }, [genStatus.image.isGenerating, genStatus.edit.isGenerating, genStatus.video.isGenerating]);

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

  const updateGenStatus = (type: GenType, updates: Partial<GenerationState>) => {
      setGenStatus(prev => ({
          ...prev,
          [type]: { ...prev[type], ...updates }
      }));
  };

  const handleCancel = (type: GenType) => {
    if (abortControllers.current[type]) {
        abortControllers.current[type]?.abort();
        abortControllers.current[type] = null;
        updateGenStatus(type, { isGenerating: false, error: "Cancelled by user" });
    }
  };

  const startGeneration = (type: GenType) => {
    if (abortControllers.current[type]) abortControllers.current[type]?.abort();
    abortControllers.current[type] = new AbortController();
    
    updateGenStatus(type, { isGenerating: true, progress: 0, error: null });
    
    return abortControllers.current[type]!.signal;
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
  
  const toggleLightboxFullscreen = () => {
      if (lightboxRef.current) {
          if (document.fullscreenElement) {
              document.exitFullscreen();
          } else {
              lightboxRef.current.requestFullscreen().catch(err => console.error(err));
          }
      }
  };

  const addToHistory = async (blob: Blob, type: 'image' | 'video', prompt: string) => {
      const url = URL.createObjectURL(blob);
      const newItem: MediaItem = {
          id: crypto.randomUUID(),
          type,
          url,
          prompt,
          title: prompt, // Default title to prompt
          createdAt: Date.now()
      };
      setMediaHistory(prev => [newItem, ...prev]);

      // For authenticated users, ALWAYS save to Supabase
      if (isAuthenticated && userId) {
          const currentSessionId = localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id');
          if (currentSessionId) {
              await supabaseService.saveMediaItem(newItem, blob, currentSessionId, userId);
          }
      }
  };
  
  const handleDeleteMedia = async (item: MediaItem) => {
      if (confirm("Are you sure you want to delete this?")) {
          setMediaHistory(prev => prev.filter(p => p.id !== item.id));
          setSelectedMediaItem(null); // Close modal
          
          // For authenticated users, delete from Supabase
          if (isAuthenticated && userId) {
              const currentSessionId = localStorage.getItem('chutes_current_session_id') || localStorage.getItem('chutes_session_id');
              if (currentSessionId) {
                  await supabaseService.deleteMediaItem(item, currentSessionId, userId);
              }
          }
      }
  };

  const handleRenameMedia = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMediaItem || !editTitleValue.trim()) return;
      
      const newTitle = editTitleValue.trim();
      
      // Optimistic update
      setMediaHistory(prev => prev.map(item => 
          item.id === selectedMediaItem.id ? { ...item, title: newTitle } : item
      ));
      setSelectedMediaItem(prev => prev ? { ...prev, title: newTitle } : null);
      setIsEditingTitle(false);

      // For authenticated users, update title in Supabase
      if (isAuthenticated && userId) {
          await supabaseService.updateMediaItemTitle(selectedMediaItem.id, newTitle);
      }
  };

  const handleEnhancePrompt = async (currentPrompt: string, setter: (val: string) => void) => {
      if (!currentPrompt.trim()) return;
      setIsEnhancing(true);
      try {
          const enhanced = await chutesService.enhancePrompt(currentPrompt);
          if (enhanced) setter(enhanced);
      } catch (e) {
          console.error("Failed to enhance", e);
      } finally {
          setIsEnhancing(false);
      }
  };

  // --- HANDLERS ---

  const handleImageGeneration = async () => {
    if (!imagePrompt) return;
    
    // Check credits first
    if (!await checkCredits('image')) return;
    
    const signal = startGeneration('image');
    setGeneratedImageUrl(null);

    try {
      let modelUrl = '';
      let modelId = selectedImageModel;

      if (selectedImageModel === 'custom') {
        if (!customImageModelUrl) throw new Error("Please enter a custom model URL");
        modelUrl = customImageModelUrl;
        modelId = undefined; // Force custom logic
      } else {
        const model = AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel);
        if (model) modelUrl = model.url;
      }

      const rawBlob = await chutesService.generateImage({
        prompt: imagePrompt,
        modelUrl,
        modelId
      }, signal);

      const watermarkedBlob = await WatermarkService.addWatermarkToImage(rawBlob);
      const url = URL.createObjectURL(watermarkedBlob);
      setGeneratedImageUrl(url);
      addToHistory(watermarkedBlob, 'image', imagePrompt);
      
      // Deduct credits after successful generation
      await deductCredits('image');

    } catch (err: any) {
      if (err.name !== 'AbortError') updateGenStatus('image', { error: err.message });
    } finally {
      if (!signal.aborted) updateGenStatus('image', { isGenerating: false, progress: 100 });
    }
  };

  const handleEditGeneration = async () => {
    if (!editPrompt || !editSourceImage) return;
    
    // Check credits first
    if (!await checkCredits('edit')) return;
    
    const signal = startGeneration('edit');
    setEditedImageUrl(null);

    try {
        const modelUrl = AVAILABLE_EDIT_MODELS[0].url;
        
        const rawBlob = await chutesService.editImage({
            prompt: editPrompt,
            image_b64: editSourceImage,
            modelUrl
        }, signal);

        const watermarkedBlob = await WatermarkService.addWatermarkToImage(rawBlob);
        const url = URL.createObjectURL(watermarkedBlob);
        setEditedImageUrl(url);
        addToHistory(watermarkedBlob, 'image', editPrompt + " (Edited)");
        
        // Deduct credits after successful generation
        await deductCredits('edit');

    } catch (err: any) {
        if (err.name !== 'AbortError') updateGenStatus('edit', { error: err.message });
    } finally {
      if (!signal.aborted) updateGenStatus('edit', { isGenerating: false, progress: 100 });
    }
  };

  const handleVideoGeneration = async () => {
    // Validation
    if (!videoPrompt) return;
    if (videoMode === 'i2v' && !sourceImage) return;
    
    // Check credits first
    if (!await checkCredits('video')) return;

    const signal = startGeneration('video');
    setGeneratedVideoUrl(null);

    try {
      const model = AVAILABLE_VIDEO_MODELS.find(m => m.id === selectedVideoModel);
      if (!model) throw new Error("Selected video model not found");
      const modelUrl = model.url;

      const blob = await chutesService.generateVideo({
        prompt: videoPrompt,
        image: videoMode === 'i2v' ? sourceImage! : undefined,
        modelUrl,
        modelId: selectedVideoModel
      }, signal);

      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
      addToHistory(blob, 'video', videoPrompt);
      
      // Deduct credits after successful generation
      await deductCredits('video');

    } catch (err: any) {
      if (err.name !== 'AbortError') updateGenStatus('video', { error: err.message });
    } finally {
      if (!signal.aborted) updateGenStatus('video', { isGenerating: false, progress: 100 });
    }
  };

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

  // --- WORKFLOW TRANSITIONS ---

  const transferToEdit = async (imageUrl: string | null, isBase64: boolean = false) => {
    if (!imageUrl) return;
    try {
        const b64 = isBase64 ? imageUrl : await convertUrlToBase64(imageUrl);
        setEditSourceImage(b64);
        setActiveTab('edit');
        updateGenStatus('edit', { error: null });
        setIsCaptureModalOpen(false);
        setSelectedMediaItem(null);
    } catch (e) {
        updateGenStatus('edit', { error: "Failed to load image for editing." });
    }
  };

  const transferToVideo = async (imageUrl: string | null, isBase64: boolean = false) => {
    if (!imageUrl) return;
    try {
        const b64 = isBase64 ? imageUrl : await convertUrlToBase64(imageUrl);
        setSourceImage(b64);
        setVideoMode('i2v'); // Force I2V mode when transferring an image
        setActiveTab('video');
        updateGenStatus('video', { error: null });
        setIsCaptureModalOpen(false);
        setSelectedMediaItem(null);
    } catch (e) {
        updateGenStatus('video', { error: "Failed to load image for animation." });
    }
  };

  const handleExtendVideo = async () => {
    if (!generatedVideoUrl) return;
    updateGenStatus('video', { error: null });
    
    try {
        const lastFrame = await extractFrameFromVideo(generatedVideoUrl);
        setCapturedFrame(lastFrame);
        setIsCaptureModalOpen(true);
    } catch (e) {
        updateGenStatus('video', { error: "Could not extract last frame from video." });
        console.error(e);
    }
  };

  const applyQuickEdit = (prompt: string) => {
      setEditPrompt(prompt);
  };

  const filteredHistory = mediaHistory.filter(item => {
      if (galleryFilter === 'all') return true;
      return item.type === galleryFilter;
  });

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto glass-card md:rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in duration-500 ring-1 ring-white/20 dark:ring-white/5 relative">
      
      {/* Header Tabs */}
      <div className="flex border-b border-gray-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-x-auto shrink-0">
        {[
            { id: 'image', label: 'Generator', icon: Image },
            { id: 'edit', label: 'Magic Edit', icon: Scissors },
            { id: 'video', label: 'Animator', icon: Film },
            { id: 'gallery', label: 'Gallery', icon: Grid }
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[100px] py-4 sm:py-5 text-sm font-medium flex items-center justify-center gap-2.5 transition-all relative group overflow-hidden ${
                    activeTab === tab.id 
                    ? 'text-primary bg-primary/5 dark:bg-primary/10' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/10 dark:hover:bg-white/5'
                }`}
            >
                <div className="relative">
                    <tab.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                    {/* Show tiny dot if this tab is generating in background */}
                    {tab.id !== 'gallery' && genStatus[tab.id as GenType].isGenerating && activeTab !== tab.id && (
                        <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-primary animate-pulse border border-white dark:border-slate-900"></span>
                    )}
                </div>
                <span className="tracking-wide hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_#1abc9c]" />
                )}
            </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {activeTab === 'gallery' ? (
            <div className="h-full animate-in slide-in-from-bottom-4 flex flex-col">
                
                {/* Gallery Filter Bar */}
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Grid className="w-5 h-5 text-primary" />
                        Media History
                    </h3>
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                        {(['all', 'image', 'video'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setGalleryFilter(f)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                                    galleryFilter === f 
                                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
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
                                onClick={() => setSelectedMediaItem(item)}
                                className="group relative rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 aspect-square shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-primary/30 cursor-pointer"
                            >
                                {item.type === 'video' ? (
                                    <>
                                        <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                                        <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md backdrop-blur-sm z-10">
                                            <Video className="w-3.5 h-3.5" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" loading="lazy" />
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
            </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Controls Column */}
          <div className="lg:col-span-4 flex flex-col gap-6 animate-in slide-in-from-left-4 duration-500 delay-100 order-2 lg:order-1 pb-10">
            {/* ... (Existing Image/Edit/Video Control Logic - No changes here, kept layout intact) ... */}
            
            {/* Image Tab Controls */}
            {activeTab === 'image' && (
                 <div className="space-y-6">
                   <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
                       <Label className="mb-2 block">Model</Label>
                       <Select value={selectedImageModel} onChange={(e) => setSelectedImageModel(e.target.value)}>
                         {AVAILABLE_IMAGE_MODELS.map(m => (
                           <option key={m.id} value={m.id}>{m.name}</option>
                         ))}
                         <option value="custom">Custom URL...</option>
                       </Select>
                       
                       {selectedImageModel === 'custom' && (
                         <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <Label className="mb-1 block text-xs">Custom Endpoint URL</Label>
                            <Input value={customImageModelUrl} onChange={(e) => setCustomImageModelUrl(e.target.value)} placeholder="https://chutes-..." size="sm" />
                         </div>
                       )}
                   </div>

                   <div className="space-y-3 relative">
                     <div className="flex justify-between items-center">
                        <Label>Prompt</Label>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEnhancePrompt(imagePrompt, setImagePrompt)} 
                            disabled={isEnhancing || !imagePrompt}
                            className="h-6 text-xs text-primary hover:text-primary-dark px-2 gap-1.5"
                        >
                            {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            Magic Enhance
                        </Button>
                     </div>
                     <Textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="A futuristic city with flying cars, cyberpunk style, 8k resolution..."
                        className="h-40 text-base"
                     />
                     {AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)?.maxLength && (
                        <div className={`text-xs text-right transition-colors ${imagePrompt.length > (AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)?.maxLength || 0) ? 'text-red-500' : 'text-gray-400'}`}>
                            {imagePrompt.length} / {AVAILABLE_IMAGE_MODELS.find(m => m.id === selectedImageModel)?.maxLength}
                        </div>
                     )}
                   </div>

                   <div>
                       <Button
                            onClick={() => isAuthenticated ? handleImageGeneration() : onRequestAuth()}
                            disabled={genStatus.image.isGenerating || !imagePrompt || !isAuthenticated}
                            className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${genStatus.image.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
                        >
                          {genStatus.image.isGenerating ? 'Generating...' : (isAuthenticated ? <><Sparkles className="w-5 h-5 mr-2" /> Generate Image</> : 'Sign In to Generate Image')}
                       </Button>
                       {genStatus.image.isGenerating && <Progress value={genStatus.image.progress} />}
                   </div>
                 </div>
            )}

            {/* Edit Tab Controls */}
            {activeTab === 'edit' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Image to Edit</Label>
                    <div 
                        className="relative h-56 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden group shadow-inner"
                    >
                        {editSourceImage ? (
                            <>
                                <img src={editSourceImage} alt="Source" className="w-full h-full object-contain cursor-pointer" onClick={() => editInputRef.current?.click()} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center backdrop-blur-sm pointer-events-none">
                                    <span className="text-white font-medium flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20"><Upload className="w-4 h-4"/> Change Image</span>
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

                  <div className="space-y-3">
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

                  <div>
                      <Button
                        onClick={() => isAuthenticated ? handleEditGeneration() : onRequestAuth()}
                        disabled={genStatus.edit.isGenerating || !editPrompt || !editSourceImage || !isAuthenticated}
                        className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${genStatus.edit.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
                      >
                          {genStatus.edit.isGenerating ? 'Applying Magic...' : (isAuthenticated ? <><Scissors className="w-5 h-5 mr-2" /> Apply Edits</> : 'Sign In to Apply Edits')}
                      </Button>
                      {genStatus.edit.isGenerating && <Progress value={genStatus.edit.progress} />}
                  </div>
                </div>
            )}

            {/* Video Tab Controls */}
            {activeTab === 'video' && (
                <div className="space-y-6">
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10">
                        <button 
                            onClick={() => setVideoMode('i2v')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                                videoMode === 'i2v' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <FileImage className="w-4 h-4" /> Image-to-Video
                        </button>
                        <button 
                            onClick={() => setVideoMode('t2v')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                                videoMode === 't2v' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Type className="w-4 h-4" /> Text-to-Video
                        </button>
                    </div>

                    <div className="bg-white/30 dark:bg-slate-800/30 p-3 rounded-xl border border-white/40 dark:border-white/5">
                        <Label className="mb-2 block text-xs uppercase text-gray-500 font-bold">Model Engine</Label>
                        <Select value={selectedVideoModel} onChange={(e) => setSelectedVideoModel(e.target.value)}>
                            {AVAILABLE_VIDEO_MODELS.filter(m => m.type === videoMode).map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </Select>
                    </div>

                  {videoMode === 'i2v' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <Label>Input Frame</Label>
                        <div 
                            className="relative h-56 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden group shadow-inner"
                        >
                            {sourceImage ? (
                                <>
                                    <img src={sourceImage} alt="Source" className="w-full h-full object-contain cursor-pointer" onClick={() => fileInputRef.current?.click()} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 items-center justify-center backdrop-blur-sm pointer-events-none">
                                        <span className="text-white font-medium flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20"><Upload className="w-4 h-4"/> Change Frame</span>
                                    </div>
                                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                        <Button 
                                            variant="glass" 
                                            size="icon" 
                                            onClick={(e) => { e.stopPropagation(); downloadBase64(sourceImage, 'source-frame.png'); }}
                                            title="Download Source Frame"
                                            className="h-8 w-8 bg-black/50 text-white border-none hover:bg-black/70"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                        <Video className="w-8 h-8 text-primary/60" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Click to Upload Frame</span>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setSourceImage)} />
                        </div>
                    </div>
                  )}

                  <div className="space-y-3 relative">
                    <div className="flex justify-between items-center">
                        <Label>{videoMode === 'i2v' ? 'Motion Prompt' : 'Video Description'}</Label>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEnhancePrompt(videoPrompt, setVideoPrompt)} 
                            disabled={isEnhancing || !videoPrompt}
                            className="h-6 text-xs text-primary hover:text-primary-dark px-2 gap-1.5"
                        >
                            {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            Magic Enhance
                        </Button>
                     </div>
                    <Textarea
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder={videoMode === 'i2v' ? "Camera pans right, the leaves are blowing..." : "A cinematic drone shot of a cyberpunk city at night, raining..."}
                        className="h-32 text-base"
                     />
                  </div>

                  <div>
                      <Button
                        onClick={() => isAuthenticated ? handleVideoGeneration() : onRequestAuth()}
                        disabled={genStatus.video.isGenerating || !videoPrompt || (videoMode === 'i2v' && !sourceImage) || !isAuthenticated}
                        className={`w-full h-14 text-lg font-semibold rounded-xl shadow-xl transition-all ${genStatus.video.isGenerating ? 'opacity-80' : 'hover:scale-[1.02] shadow-primary/20'}`}
                      >
                          {genStatus.video.isGenerating ? 'Animating...' : (isAuthenticated ? <><Film className="w-5 h-5 mr-2" /> Animate Video</> : 'Sign In to Animate Video')}
                       </Button>
                       <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">Video generation typically takes 60-90 seconds.</p>
                       {genStatus.video.isGenerating && <Progress value={genStatus.video.progress} />}
                  </div>
                </div>
            )}
            
            {/* Global Error & Cancel */}
            {genStatus[activeTab as GenType]?.isGenerating && (
                <div className="animate-in fade-in slide-in-from-bottom-2 mt-4">
                     <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                        <span>Status: {Math.round(genStatus[activeTab as GenType].progress)}%</span>
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

            {genStatus[activeTab as GenType]?.error && !genStatus[activeTab as GenType].isGenerating && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{genStatus[activeTab as GenType].error}</span>
                </div>
            )}
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-[400px] animate-in slide-in-from-right-4 duration-500 delay-200 order-1 lg:order-2">
             <div className="flex-1 rounded-2xl border border-white/40 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md shadow-inner flex items-center justify-center relative overflow-hidden group p-2 min-h-[400px]">
                
                {/* Only show overlay if this specific tab is generating */}
                {genStatus[activeTab as GenType]?.isGenerating && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-500">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                            </div>
                        </div>
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-200 animate-pulse">
                            {activeTab === 'image' ? 'Dreaming up visuals...' : activeTab === 'edit' ? 'Applying magic...' : 'Rendering frames...'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment</span>
                    </div>
                )}

                {/* Content Render Logic */}
                {activeTab === 'image' && generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                ) : activeTab === 'edit' && editedImageUrl ? (
                    <img src={editedImageUrl} alt="Edited" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                ) : activeTab === 'video' && generatedVideoUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-lg overflow-hidden group/video">
                        <video 
                            ref={videoRef}
                            src={generatedVideoUrl} 
                            controls 
                            playsInline
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain" 
                        />
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
                            <Button variant="glass" size="icon" onClick={toggleFullscreen} title="Fullscreen">
                                <Maximize2 className="w-5 h-5 text-white" />
                            </Button>
                            <Button variant="glass" size="icon" onClick={handleCaptureCurrentFrame} title="Capture Current Frame">
                                <Camera className="w-5 h-5 text-white" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 dark:text-gray-600 p-8 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-white/30 dark:bg-slate-800/30 flex items-center justify-center mb-6 shadow-sm border border-white/20 dark:border-white/5">
                            {activeTab === 'image' && <Image className="w-10 h-10 opacity-50" />}
                            {activeTab === 'edit' && <Scissors className="w-10 h-10 opacity-50" />}
                            {activeTab === 'video' && <Film className="w-10 h-10 opacity-50" />}
                        </div>
                        <p className="text-lg font-medium opacity-70">
                            {activeTab === 'edit' ? "Edited result appears here" : activeTab === 'video' ? "Video result appears here" : "Generated result appears here"}
                        </p>
                    </div>
                )}
             </div>

             {/* Footer Actions */}
             <div className="mt-6 flex flex-wrap justify-end gap-3 pb-8 lg:pb-0">
                {activeTab === 'image' && generatedImageUrl && (
                    <>
                        <Button variant="glass" onClick={() => transferToEdit(generatedImageUrl)}>
                            <Scissors className="w-4 h-4 mr-2 text-purple-500" /> Magic Edit
                        </Button>
                        <Button variant="glass" onClick={() => transferToVideo(generatedImageUrl)}>
                            <Film className="w-4 h-4 mr-2 text-blue-500" /> Animate
                        </Button>
                        <a href={generatedImageUrl} download={`generated-image-${Date.now()}.png`}>
                            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
                        </a>
                    </>
                )}
                {/* ... other actions (Edit/Video) similar to before ... */}
                 {activeTab === 'edit' && editedImageUrl && (
                    <>
                        <Button variant="glass" onClick={() => transferToVideo(editedImageUrl)}>
                            <Film className="w-4 h-4 mr-2 text-blue-500" /> Animate
                        </Button>
                        <a href={editedImageUrl} download={`edited-image-${Date.now()}.png`}>
                            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
                        </a>
                    </>
                )}
                {activeTab === 'video' && generatedVideoUrl && (
                    <>
                        <Button variant="glass" onClick={() => handleExtendVideo()}>
                            <ArrowRight className="w-4 h-4 mr-2 text-green-500" /> Extend Video (Last Frame)
                        </Button>
                        <a href={generatedVideoUrl} download={`generated-video-${Date.now()}.mp4`}>
                            <Button variant="primary"><Download className="w-4 h-4 mr-2" />Download</Button>
                        </a>
                    </>
                )}
             </div>
          </div>
        </div>
        )}
      </div>

      {/* Lightbox / Media Viewer Modal */}
      {selectedMediaItem && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in">
             <div ref={lightboxRef} className="relative w-full h-full flex flex-col">
                 
                 {/* Top Bar */}
                 <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10 shrink-0">
                     <div className="flex items-center gap-3">
                         {isEditingTitle ? (
                             <form onSubmit={handleRenameMedia} className="flex items-center gap-2">
                                 <input 
                                    autoFocus
                                    className="bg-white/10 text-white rounded px-2 py-1 text-sm border border-white/30 focus:outline-none focus:border-primary"
                                    value={editTitleValue}
                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                    onBlur={() => setIsEditingTitle(false)}
                                 />
                                 <button type="submit" className="p-1 rounded-full bg-primary/20 hover:bg-primary/40 text-primary"><Check className="w-4 h-4" /></button>
                             </form>
                         ) : (
                             <h3 className="text-white font-medium text-lg flex items-center gap-3">
                                 {selectedMediaItem.title || selectedMediaItem.prompt}
                                 <button 
                                    onClick={() => {
                                        setIsEditingTitle(true);
                                        setEditTitleValue(selectedMediaItem.title || selectedMediaItem.prompt);
                                    }}
                                    className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                 >
                                     <Pencil className="w-4 h-4" />
                                 </button>
                             </h3>
                         )}
                     </div>
                     <button onClick={() => setSelectedMediaItem(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                         <X className="w-6 h-6" />
                     </button>
                 </div>

                 {/* Center Content */}
                 <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                     {selectedMediaItem.type === 'video' ? (
                         <video 
                            src={selectedMediaItem.url} 
                            controls 
                            autoPlay 
                            loop 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                         />
                     ) : (
                         <img 
                            src={selectedMediaItem.url} 
                            alt={selectedMediaItem.title} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                         />
                     )}
                 </div>

                 {/* Bottom Bar Actions */}
                 <div className="p-6 flex justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent z-10 shrink-0">
                     <Button variant="glass" className="text-white border-white/20 hover:bg-white/10" onClick={toggleLightboxFullscreen}>
                         <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
                     </Button>
                     
                     <a href={selectedMediaItem.url} download>
                        <Button variant="glass" className="text-white border-white/20 hover:bg-white/10">
                            <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                     </a>

                     {selectedMediaItem.type === 'image' && (
                         <>
                            <Button variant="glass" className="text-purple-300 border-purple-500/30 hover:bg-purple-500/20" onClick={() => transferToEdit(selectedMediaItem.url)}>
                                <Scissors className="w-4 h-4 mr-2" /> Edit
                            </Button>
                            <Button variant="glass" className="text-blue-300 border-blue-500/30 hover:bg-blue-500/20" onClick={() => transferToVideo(selectedMediaItem.url)}>
                                <Film className="w-4 h-4 mr-2" /> Animate
                            </Button>
                         </>
                     )}
                     {selectedMediaItem.type === 'video' && (
                         <Button variant="glass" className="text-green-300 border-green-500/30 hover:bg-green-500/20" onClick={() => {
                             setSelectedMediaItem(null);
                             // Need to extract frame logic here or pass URL
                             // Simplified: just set URL to generatedVideoUrl to trigger logic
                             setGeneratedVideoUrl(selectedMediaItem.url);
                             setTimeout(() => handleExtendVideo(), 100);
                             setActiveTab('video');
                         }}>
                            <ArrowRight className="w-4 h-4 mr-2" /> Extend
                        </Button>
                     )}

                     <div className="w-px h-10 bg-white/10 mx-2"></div>
                     
                     <Button variant="destructive" className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border-red-500/30" onClick={() => handleDeleteMedia(selectedMediaItem)}>
                         <Trash2 className="w-4 h-4 mr-2" /> Delete
                     </Button>
                 </div>
             </div>
         </div>
      )}

      {/* Capture Frame Modal */}
      {isCaptureModalOpen && capturedFrame && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-slate-900 rounded-2xl border border-white/20 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                 <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                     <h3 className="font-bold text-lg flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        Captured Frame
                     </h3>
                     <Button variant="ghost" size="icon" onClick={() => setIsCaptureModalOpen(false)}>
                         <X className="w-5 h-5" />
                     </Button>
                 </div>
                 
                 <div className="flex-1 p-6 flex items-center justify-center bg-gray-100 dark:bg-black/40 overflow-hidden">
                     <img src={capturedFrame} alt="Captured" className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg border border-white/10" />
                 </div>
                 
                 <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="text-sm text-gray-500">
                         Choose what to do with this frame:
                     </div>
                     <div className="flex flex-wrap gap-3 justify-end">
                         <Button 
                            variant="secondary" 
                            onClick={() => downloadBase64(capturedFrame, 'captured-frame.png')}
                         >
                             <Download className="w-4 h-4 mr-2" /> Download
                         </Button>
                         <Button 
                            variant="glass"
                            className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
                            onClick={() => transferToEdit(capturedFrame, true)}
                         >
                             <Scissors className="w-4 h-4 mr-2" /> Edit This
                         </Button>
                         <Button 
                            variant="primary"
                            onClick={() => transferToVideo(capturedFrame, true)}
                         >
                             <Film className="w-4 h-4 mr-2" /> Animate This
                         </Button>
                     </div>
                 </div>
             </div>
        </div>
      )}

    </div>
  );
};

export default MediaStudio;
