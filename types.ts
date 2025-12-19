
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
  id?: string;
  timestamp?: number;
  audioUrl?: string; // Blob URL for local playback
  audio_url?: string; // Remote URL from Supabase
  tool_call_id?: string; // For tool responses
  name?: string; // For tool responses
  tool_calls?: any[]; // For assistant tool requests
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  preview: string;
}

export interface MediaItem {
  id: string;
  title?: string; // User-defined title
  type: 'image' | 'video';
  url: string;
  prompt: string;
  createdAt: number;
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
}

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful and empathetic AI assistant. You answer concisely and clearly.";

export const AVAILABLE_MODELS = [
  { id: "zai-org/GLM-4.6", name: "GLM 4.6 (Default)" },
  { id: "deepseek-ai/DeepSeek-V3.2-Speciale", name: "DeepSeek V3.2 Speciale" },
  { id: "meituan-longcat/LongCat-Flash-Chat-FP8", name: "LongCat Flash" },
  { id: "MiniMaxAI/MiniMax-M2", name: "MiniMax M2" },
  { id: "deepseek-ai/DeepSeek-R1-0528", name: "DeepSeek R1" },
  { id: "moonshotai/Kimi-K2-Thinking", name: "Kimi K2 (Thinking)" },
  { id: "Qwen/Qwen3-VL-235B-A22B-Thinking", name: "Qwen 3 VL (Thinking)" }
];

export const AVAILABLE_IMAGE_MODELS = [
  { id: "hunyuan", name: "Hunyuan Image 3", url: "https://chutes-hunyuan-image-3.chutes.ai/generate" },
  { id: "qwen-image", name: "Qwen Image", url: "https://image.chutes.ai/generate" },
  { id: "z-image-turbo", name: "Z-Image Turbo", url: "https://chutes-z-image-turbo.chutes.ai/generate", maxLength: 450 },
  { id: "hidream", name: "HiDream", url: "https://chutes-hidream.chutes.ai/generate" },
  { id: "juggernaut-xl", name: "Juggernaut XL Ragnarok", url: "https://image.chutes.ai/generate" },
  { id: "flux-schnell", name: "FLUX.1 Schnell", url: "https://image.chutes.ai/generate" },
];

export const AVAILABLE_EDIT_MODELS = [
  { id: "qwen-image-edit", name: "Qwen Magic Edit", url: "https://chutes-qwen-image-edit-2509.chutes.ai/generate" }
];

export const AVAILABLE_VIDEO_MODELS = [
  { id: "wan-2.2-i2v", name: "Wan 2.2 I2V (Fast)", url: "https://chutes-wan-2-2-i2v-14b-fast.chutes.ai/generate", type: 'i2v' },
  { id: "wan-2.1-t2v", name: "Wan 2.1 T2V (14B)", url: "https://chutes-wan2-1-14b.chutes.ai/text2video", type: 't2v' }
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
}

export interface ImageEditRequest {
    prompt: string;
    image_b64: string;
    modelUrl: string;
}

export interface VideoGenRequest {
  prompt: string;
  image?: string; // base64 or url (Optional for T2V)
  modelUrl: string;
  modelId?: string;
}
