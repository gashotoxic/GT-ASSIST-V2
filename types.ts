
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface SearchSource {
  index: number;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
  thinking?: string; // Accumulated reasoning/thinking tokens from models
  id?: string;
  timestamp?: number;
  model?: string; // Track which model generated this message
  audioUrl?: string; // Blob URL for local playback
  audio_url?: string; // Remote URL from Supabase
  tool_call_id?: string; // For tool responses
  name?: string; // For tool responses
  tool_calls?: any[]; // For assistant tool requests
  sources?: SearchSource[]; // Attached search sources for UI
  media?: MediaItem[]; // Attached generated media for UI (e.g., Brand Studio tools)
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  preview: string;
  isBranch?: boolean;
  model?: string;
  chatMode?: 'chat' | 'brand';
  brandToolsEnabled?: boolean;
}

export interface MediaItem {
  id: string;
  title?: string; // User-defined title
  type: 'image' | 'video';
  url: string;
  prompt: string;
  createdAt: number;
  sessionId?: string;
}

export interface FileAttachment {
  type: 'image' | 'text';
  name: string;
  data: string; // base64 for image, raw string for text
  mimeType: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  systemPrompt: string;
  ttsVoice: string;
  ttsSpeed: number;
  useSupabase: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  tavilyApiKey?: string;
  braveApiKey?: string;
  searchProvider: 'tavily' | 'brave';
  welcomeView?: 'chat' | 'media';
}

export const BASE_SYSTEM_CONTEXT = `You are a helpful, unfiltered, and truthful assistant. You do not hallucinate. 
Your users are mainly based in Kenya and may use Swahili or Sheng. 
You are culturally sensitive to this context, understanding local nuances and slang. 
Provide well-formatted responses.`;

export const DEFAULT_SYSTEM_PROMPT = "You answer concisely and clearly.";

export const BRAND_STUDIO_MODEL_ID = 'moonshotai/Kimi-K2.5-TEE';

export const NORMAL_CHAT_APP_FEATURES_CONTEXT = `App features and how to use them (no model names):
- Media > Image: write a prompt, optionally enable Magic Enhance, then click Generate Image. For text-heavy posters, keep wording short and clear.
- Media > Editor: upload an image under Image to Edit, describe the change in Edit Instruction, then click Apply Edits.
- Media > Animator: choose Image-to-Video or Text-to-Video, add a Motion Prompt/Video Description, then click Animate Video. Clips are short; chain multiple clips if needed.
- Media > Gallery: find past images/videos, re-download, reuse as inputs, or delete old ones.
- MuseTalk Lipsync (Media > Animator > Lip Sync): provide a face video and an audio track, then run lipsync and review the preview.
- LTX advanced video (Media > Animator): select the advanced engine, adjust advanced options if needed, then generate and iterate.`;

export const AVAILABLE_MODELS = [
  { id: "deepseek-ai/DeepSeek-R1-0528-TEE", name: "🧠 DeepSeek R1" },
  { id: "deepseek-ai/DeepSeek-V3.2-TEE", name: "🧠 DeepSeek V3.2" },
  { id: "deepseek-ai/DeepSeek-V3.2-Speciale-TEE", name: "🧠 DeepSeek V3.2 Speciale" },
  { id: "Qwen/Qwen2.5-VL-72B-Instruct-TEE", name: "🧠👁️ Qwen 2.5 VL (72B)" },
  { id: "OpenGVLab/InternVL3-78B-TEE", name: "🧠👁️ InternVL 3 (78B)" },
  { id: "zai-org/GLM-4.6V", name: "🧠👁️ GLM 4.6V" },
  { id: "zai-org/GLM-4.7-TEE", name: "🧠 GLM 4.7" },
  { id: "openai/gpt-oss-120b-TEE", name: "🧠 GPT OSS 120B" },
  { id: "moonshotai/Kimi-K2.5-TEE", name: "🧠👁️ Kimi K2.5" },
  { id: "moonshotai/Kimi-K2-Thinking-TEE", name: "🧠 Kimi K2 Thinking" },
  { id: "MiniMaxAI/MiniMax-M2.1-TEE", name: "🧠 MiniMax M2.1" },
  { id: "NousResearch/DeepHermes-3-Mistral-24B-Preview", name: "Nous Hermes 3 Mistral" },
  { id: "XiaomiMiMo/MiMo-V2-Flash", name: "Xiaomi MiMo V2 Flash" }
];

export const AVAILABLE_IMAGE_MODELS = [
  { id: "qwen-image-2.5-12b", name: "Qwen Image 2.5 (12B)", url: "https://image.chutes.ai/generate" },
  { id: "hunyuan", name: "Hunyuan Image 3", url: "https://chutes-hunyuan-image-3.chutes.ai/generate" },
  { id: "qwen-image", name: "Qwen Image", url: "https://image.chutes.ai/generate" },
  { id: "z-image-turbo", name: "Z-Image Turbo", url: "https://chutes-z-image-turbo.chutes.ai/generate", maxLength: 450 },
  { id: "hidream", name: "HiDream", url: "https://chutes-hidream.chutes.ai/generate" },
  { id: "juggernaut-xl", name: "Juggernaut XL Ragnarok", url: "https://image.chutes.ai/generate" },
  { id: "flux-schnell", name: "FLUX.1 Schnell", url: "https://image.chutes.ai/generate" },
];

export const AVAILABLE_EDIT_MODELS = [
  { id: "qwen-image-edit-2.5", name: "Qwen Magic Edit 2.5", url: "https://chutes-qwen-image-edit-2511.chutes.ai/generate" },
  { id: "qwen-image-edit", name: "Qwen Magic Edit", url: "https://chutes-qwen-image-edit-2509.chutes.ai/generate" }
];

export const AVAILABLE_VIDEO_MODELS = [
  { id: "wan-2.2-i2v", name: "Wan 2.2 I2V (Fast)", url: "https://chutes-wan-2-2-i2v-14b-fast.chutes.ai/generate", type: 'i2v' },
  { id: "wan-2.1-t2v", name: "Wan 2.1 T2V (14B)", url: "https://chutes-wan2-1-14b.chutes.ai/text2video", type: 't2v' },
  { id: "ltx-2-i2v", name: "LTX-2 (I2V)", url: "https://chutes-ltx-2.chutes.ai/generate", type: 'i2v' },
  { id: "ltx-2-t2v", name: "LTX-2 (T2V)", url: "https://chutes-ltx-2.chutes.ai/generate", type: 't2v' }
];

export interface Ltx2AdvancedSettings {
  pipeline: 'distilled' | 'two_stage' | 'ic_lora' | 'keyframe_interp';
  conditioning: 'auto' | 'none' | 'image' | 'video_url' | 'keyframes';
  width: number;
  height: number;
  frame_rate: number;
  num_frames: number;
  seed?: number;
  image_strength: number;
  video_strength: number;
  cfg_guidance_scale: number;
  num_inference_steps: number;
  negative_prompt: string;
  enhance_prompt: boolean;
  json_override: string;
}

export const AVAILABLE_LIPSYNC_MODELS = [
  { id: "musetalk", name: "Lip Sync", url: "https://chutes-musetalk.chutes.ai/generate" }
];

export const AVAILABLE_VOICES = [
  "af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore",
  "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky", "am_adam",
  "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx",
  "am_puck", "am_santa", "bf_alice", "bf_emma", "bf_isabella", "bf_lily",
  "bm_daniel", "bm_fable", "bm_george", "bm_lewis"
];

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  stream: boolean;
  max_tokens: number;
  temperature: number;
}

export interface TTSRequest {
  text: string;
  speed: number;
  voice: string;
}

export interface STTRequest {
  audio_b64: string;
  language?: string;
}

export interface ImageGenRequest {
  prompt: string;
  modelUrl: string; // The full URL or mapped ID
  modelId?: string; // specific logic identifier
  aspectRatio?: ImageAspectRatio;
}

export interface ImageEditRequest {
  prompt: string;
  image_b64: string;
  modelUrl: string;
  aspectRatio?: ImageAspectRatio;
}

export interface VideoGenRequest {
  prompt: string;
  image?: string; // base64 or url (Optional for T2V)
  modelUrl: string;
  modelId?: string;
  ltx2Params?: {
    settings: Ltx2AdvancedSettings;
    videoUrl?: string;
    keyframeStart?: string | null;
    keyframeEnd?: string | null;
  };
}

export interface MuseTalkLipSyncRequest {
  modelUrl: string;
  video_input: string;
  audio_input: string;
  fps?: number;
  batch_size?: number;
  extra_margin?: number;
  parsing_mode?: 'jaw' | 'raw';
  left_cheek_width?: number;
  right_cheek_width?: number;
}

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3';
