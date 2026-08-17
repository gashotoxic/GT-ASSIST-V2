
export interface ContentPart {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
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
  type: 'image' | 'video' | 'audio' | 'text';
  name: string;
  data: string; // base64 data URL for image/video/audio, raw string for text
  mimeType: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  brandModel?: string;
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

export const BASE_SYSTEM_CONTEXT = `You are a helpful, direct, and truthful assistant.

Truthfulness & uncertainty
- Do not invent facts, quotes, sources, or experiences.
- If you are not sure, say so explicitly and ask for what’s needed, or offer safe best-guess steps labeled as assumptions.
- Prefer “I don’t know yet—here’s what to check next” over confident guessing.

User context (Kenya)
- Users are mainly based in Kenya and may use English, Swahili, or Sheng.
- Be culturally sensitive to Kenyan context, local nuance, and slang.
- If the user mixes languages, mirror their language mix lightly and keep it clear.

##Formatting 
- Use well-formatted responses: short paragraphs, bullets/numbered steps when helpful, and clear section headers.
- Provide actionable steps before long explanations.

Clarifying questions (minimal engagement, all domains)
Goal: Solve the user’s request correctly with minimal back-and-forth.

Decision rule
- Answer immediately if the request is clear enough to act on safely.
- Ask clarifying questions only when missing info would materially change the solution or prevent a correct fix.

How to ask
- Ask 1–3 high-leverage questions maximum per turn.
- Prefer multiple-choice / short-fill questions that are easy to answer in one message.
- Do not ask for information the user already gave.

“98% in one turn” tactic
- If you can give a likely solution without waiting, do it:
  1) Give a best-next-step or most probable fix first.
  2) State assumptions briefly (e.g., “Assuming you’re on Windows…”).
  3) Ask one confirming question that selects the correct path (e.g., OS/app/version/error message).

Universal question templates (pick only what you need)
- Goal: “What outcome do you want?”
- Context: “Where is this happening / what are you using?”
- Evidence: “What exactly happened (error text, example input/output)?”
- Constraints: “Any limits (time, budget, tools, rules, preferences)?”

Safety & privacy
- Do not request or reveal sensitive data (passwords, OTPs, API keys, private identifiers).
- If logs/screenshots may include secrets, ask the user to redact them and specify what to keep.

#IMPORTANT — Required strong close
- End every response with ONE friendly CTA that makes continuing easy and inviting.
- The CTA must move the task forward and be answerable in one message.
- Prefer option-based CTAs (2–4 choices) or a short reply template.
- Avoid generic closers (“Let me know if you need anything else.”).
- If you already asked multiple questions earlier, the final CTA repeats only the single most important one.

CTA patterns (choose one)
- Choice: “Which one fits: A / B / C?”
- Confirm: “Am I right that you want ___ (yes/no)?”
- Next artifact: “Paste the exact error line (redact keys/passwords).”
- Preference: “Do you want the quick fix or the long-term fix?”
- Template: “Reply with: goal=__, context=__, what happened=__.”
`;

export const RESPONSE_FORMAT_CONTEXT = `Response format (mandatory unless the user explicitly asks otherwise)
- Use Markdown.
- Use clear section headers (##) when there is more than one idea/part.
- Use '-' for bullet lists and '1.' for numbered steps.
- Keep lists properly nested and aligned; do not mix bullets and numbers in the same list level.
- Leave a blank line between sections, and between paragraphs and lists.
- Prefer short paragraphs (1–3 lines) over long blocks of text.
- Use fenced code blocks for code, with a language tag when known.`;

export const DEFAULT_SYSTEM_PROMPT = "You answer concisely and clearly.";

export const BRAND_STUDIO_MODEL_ID = 'Nemotron-3-Nano-Omni-30B-TEE';

export const NORMAL_CHAT_APP_FEATURES_CONTEXT = `App features and how to use them (no model names):
- Media > Image: write a prompt, optionally enable Magic Enhance, then click Generate Image. For text-heavy posters, keep wording short and clear.
- Media > Editor: upload an image under Image to Edit, describe the change in Edit Instruction, then click Apply Edits.
- Media > Animator: choose Image-to-Video or Text-to-Video, add a Motion Prompt/Video Description, then click Animate Video. Clips are short; chain multiple clips if needed.
- Media > Gallery: find past images/videos, re-download, reuse as inputs, or delete old ones.
- MuseTalk Lipsync (Media > Animator > Lip Sync): provide a face video and an audio track, then run lipsync and review the preview.
- LTX advanced video (Media > Animator): select the advanced engine, adjust advanced options if needed, then generate and iterate.`;

export type AvailableModel = {
  id: string;
  name: string;
  shortName: string;
  supportsVision?: boolean;
  badge?: 'NEW';
  disabled?: boolean;
  type?: string; // for video models: 'i2v' | 't2v'
};

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: "Nemotron-3-Nano-Omni-30B-TEE", name: "🧠👁️ Nemotron 3 Omni (30B)", shortName: "Nemotron 3", supportsVision: true },
  { id: "deepseek-ai/DeepSeek-V3.2-TEE", name: "🧠 DeepSeek V3.2", shortName: "DeepSeek V3.2" },
  { id: "deepseek-ai/DeepSeek-V4-Flash-0731-TEE", name: "🧠 DeepSeek V4 Flash", shortName: "DeepSeek V4 Flash", badge: "NEW" },
  { id: "moonshotai/Kimi-K2.6-TEE", name: "🧠👁️ Kimi K2.6", shortName: "Kimi K2.6", supportsVision: true },
  { id: "moonshotai/Kimi-K3-TEE", name: "🧠👁️ Kimi K3", shortName: "Kimi K3", supportsVision: true, badge: "NEW" },
  { id: "google/gemma-4-31B-turbo-TEE", name: "🧠👁️ Gemma 4 (31B)", shortName: "Gemma 4", supportsVision: true },
  { id: "Qwen/Qwen3.6-27B-TEE", name: "🧠👁️ Qwen 3.6 (27B)", shortName: "Qwen 3.6", supportsVision: true },
  { id: "Qwen/Qwen3.8-27B-TEE", name: "🧠👁️ Qwen 3.8 (27B)", shortName: "Qwen 3.8", supportsVision: true, badge: "NEW" },
  { id: "Qwen/Qwen3.5-397B-A17B-TEE", name: "🧠👁️ Qwen 3.5 (397B)", shortName: "Qwen 3.5", supportsVision: true },
  { id: "Qwen/Qwen3-32B-TEE", name: "🧠 Qwen 3 (32B)", shortName: "Qwen 3 32B" },
  { id: "Qwen/Qwen3-235B-A22B-Thinking-2507-TEE", name: "🧠 Qwen 3 Thinking (235B)", shortName: "Qwen 3 Think" },
  { id: "zai-org/GLM-5.1-TEE", name: "🧠 GLM 5.1", shortName: "GLM 5.1" },
  { id: "zai-org/GLM-5.2-TEE", name: "🧠 GLM 5.2", shortName: "GLM 5.2" },
  { id: "unsloth/Mistral-Nemo-Instruct-2407-TEE", name: "🧠 Mistral Nemo", shortName: "Mistral Nemo" },
];

export const BRAND_VISION_MODEL_IDS = [
  "Nemotron-3-Nano-Omni-30B-TEE",
  "moonshotai/Kimi-K2.6-TEE",
  "moonshotai/Kimi-K3-TEE",
  "google/gemma-4-31B-turbo-TEE",
  "Qwen/Qwen3.6-27B-TEE",
  "Qwen/Qwen3.8-27B-TEE",
  "Qwen/Qwen3.5-397B-A17B-TEE",
] as const;

export const getModelInfo = (modelId: string) => AVAILABLE_MODELS.find(m => m.id === modelId);

export const getModelShortName = (modelId: string) => {
  if (!modelId) return '';
  const fromList = getModelInfo(modelId)?.shortName;
  if (fromList) return fromList;
  const guessed = modelId.split('/').pop() || modelId;
  return guessed.replace(/-TEE$/i, '').trim();
};

export const AVAILABLE_IMAGE_MODELS = [
  { id: "qwen-image-2512", name: "Qwen Image 2512", url: "https://vonkaiser-qwen-image-2512.chutes.ai/generate" },
  { id: "z-image-turbo", name: "Z-Image Turbo", url: "https://vonkaiser-z-image-turbo.chutes.ai/generate", maxLength: 450 },
  { id: "flux", name: "FLUX.1 Schnell", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
  { id: "dreamshaper", name: "Dreamshaper XL", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
  { id: "ilustmix", name: "iLustMix v80", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
  { id: "juggernaut", name: "Juggernaut XL Ragnarok", url: "https://vonkaiser-imageclassic.chutes.ai/generate" },
];

export const AVAILABLE_EDIT_MODELS = [
  { id: "qwen-image-edit", name: "Qwen Magic Edit", url: "https://vonkaiser-qwen-image-edit-2511.chutes.ai/generate" }
];

export const AVAILABLE_VIDEO_MODELS = [
  { id: "wan-2.2-i2v", name: "Wan 2.2 I2V (Fast)", url: "https://vonkaiser-turbowani2v.chutes.ai/generate", type: 'i2v' },
  { id: "wan-2.1-t2v", name: "Wan 2.1 T2V — Coming Soon", url: "https://chutes-wan2-1-14b.chutes.ai/text2video", type: 't2v', disabled: true },
  { id: "ltx-23-i2v", name: "LTX 2.3 I2V", url: "https://vonkaiser-ltx-23-video.chutes.ai/generate", type: 'i2v' },
  { id: "ltx-23-t2v", name: "LTX 2.3 T2V", url: "https://vonkaiser-ltx-23-video.chutes.ai/generate", type: 't2v' },
  { id: "ltx-25-i2v", name: "LTX 2.5 I2V", url: "https://vonkaiser-ltx-25-video.chutes.ai/generate", type: 'i2v' },
  { id: "ltx-25-t2v", name: "LTX 2.5 T2V", url: "https://vonkaiser-ltx-25-video.chutes.ai/generate", type: 't2v' }
];

export interface Ltx23AdvancedSettings {
  width: number;
  height: number;
  fps: number;
  num_frames: number | null;
  duration: number | null;
  guidance_scale: number;
  seed: number | null;
  use_random_seed: boolean;
  enhance_prompt: boolean;
  generate_audio: boolean;
  negative_prompt: string;
  json_override: string;
}

export interface Ltx25AdvancedSettings {
  width: number;
  height: number;
  fps: number;
  num_frames: number | null;
  duration: number | null;
  seed: number | null;
  use_random_seed: boolean;
  enhance_prompt: boolean;
  generate_audio: boolean;
  auto_duration: boolean;
  auto_duration_min_seconds?: number;
  auto_duration_max_seconds?: number;
  generated_keyframes: number | null; // int = evenly spaced slots, null = disabled
  stage_1_sigmas: number[];
  stage_2_sigmas: number[];
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
  editMode?: EditMode;
  stylePreset?: StylePreset;
}

export interface VideoGenRequest {
  prompt: string;
  image?: string; // base64 or url (Optional for T2V)
  modelUrl: string;
  modelId?: string;
  ltx2Params?: {
    settings: Ltx23AdvancedSettings;
    videoUrl?: string;
    keyframeStart?: string | null;
    keyframeEnd?: string | null;
  };
  ltx25Params?: {
    settings: Ltx25AdvancedSettings;
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

export type EditMode = 'smart' | 'remove_bg' | 'upscale' | 'style_transfer';

export const STYLE_PRESETS = [
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'oil_painting', name: 'Oil Painting' },
  { id: 'sketch', name: 'Sketch' },
  { id: 'anime', name: 'Anime' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'neon', name: 'Neon' },
] as const;

export type StylePreset = typeof STYLE_PRESETS[number]['id'];
