
import { Message, TTSRequest, STTRequest, ImageGenRequest, VideoGenRequest, ImageEditRequest, MuseTalkLipSyncRequest, SearchSource, ImageAspectRatio } from '../types';
import { SearchAgent } from './searchAgent';
import { isLtx25Model, buildLtx25GenerationInput } from './chutesLtx25';
import { fetchWithRetry } from './retryFetch';
import { logModelCall, type ModelCallMode } from './modelCallLog';
import { getCachedChat, setCachedChat } from './queryCache';
import { getAppUserContext } from './userContext';

const BASE_LLM_URL = 'https://llm.chutes.ai/v1/chat/completions';
const BASE_TTS_URL = 'https://vonkaiser-audiodojo.chutes.ai/speak';
const BASE_STT_URL = 'https://vonkaiser-audiodojo.chutes.ai/stt/whisper';
const BASE_MUSETALK_URL = 'https://chutes-musetalk.chutes.ai/generate';

// Server-side Chutes proxy (api/chutes.ts). All Chutes traffic goes through it
// so the API key stays in server env vars and never ships in the client bundle.
const PROXY_URL = '/api/chutes';

/** Log/latency context for one provider call (spec §1). */
type ModelCallInfo = { mode: ModelCallMode; model: string; prompt: string };

/** Best-effort model label from a provider URL when no modelId exists. */
function modelFromUrl(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    const u = new URL(url, 'https://placeholder.invalid');
    const seg = u.pathname.split('/').filter(Boolean).pop();
    return seg || u.hostname.replace(/\..*$/, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}

export class ChutesService {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  /** BYOK key when the user supplied one; otherwise the proxy injects the platform key. */
  private get userKey(): string | undefined {
    if (!this.key || this.key === 'internal') return undefined;
    return this.key;
  }

  /**
   * Every provider call crosses this boundary (spec §1). Logs exactly one
   * model_call_log row per call — successes and failures alike — with
   * prompt/model/latency. latency_ms is time-to-first-byte across internal
   * 429/503 retries (documented in database/migrations/model_call_log.sql).
   * Logging is fire-and-forget and can never break the actual call.
   */
  private async loggedCall(call: ModelCallInfo, exec: () => Promise<Response>): Promise<Response> {
    const started = Date.now();
    try {
      const response = await exec();
      void logModelCall({
        ...call,
        latency_ms: Date.now() - started,
        status: response.ok ? 'ok' : 'error',
        error: response.ok ? null : `HTTP ${response.status}`,
      });
      return response;
    } catch (err) {
      void logModelCall({
        ...call,
        latency_ms: Date.now() - started,
        status: 'error',
        error: err instanceof Error ? err.message : 'request failed',
      });
      throw err;
    }
  }

  private proxyFetch(targetUrl: string, body: unknown, call: ModelCallInfo, signal?: AbortSignal): Promise<Response> {
    return this.loggedCall(call, () =>
      this.fetchWithRetry(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, body, userKey: this.userKey }),
        signal,
      })
    );
  }

  /** Last user message text for log rows (binary parts become placeholders). */
  private describePrompt(messages: Message[]): string {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'user') {
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          return m.content
            .map((part) => (part.type === 'text' ? (part.text || '') : '[image]'))
            .join(' ');
        }
      }
    }
    return '';
  }

  // Helper for exponential backoff retry logic
  private async fetchWithRetry(url: string, options: RequestInit, retries = 3, initialDelay = 1000): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Retry on 429 (Too Many Requests) or 5xx (Server Errors)
      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        if (retries > 0) {
          const delay = initialDelay * Math.pow(2, 3 - retries); // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry(url, options, retries - 1, initialDelay);
        }
      }

      return response;
    } catch (error) {
      // AbortError should not be retried
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      if (retries > 0) {
        const delay = initialDelay * Math.pow(2, 3 - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1, initialDelay);
      }
      throw error;
    }
  }

  public cleanTextForTTS(text: string): string {
    if (!text) return '';

    return text
      // 0. Remove "Thinking" blocks (DeepSeek R1 style)
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      // 1. Replace code blocks with a spoken placeholder (reading raw code is bad)
      .replace(/```[\s\S]*?```/g, ' code block ')
      // 2. Remove Markdown links but keep the text label: [Google](google.com) -> Google
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 3. Remove Markdown header hashes (at start of lines)
      .replace(/^#+\s+/gm, '')
      // 4. Remove standard Markdown symbols (*, _, ~, `) but KEEP the text inside
      // e.g. "I am *very* happy" becomes "I am very happy"
      .replace(/[*_~`]/g, '')
      // 5. Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectImagesInPrompt(prompt: string): boolean {
    const p = prompt || '';
    if (!p.trim()) return false;
    if (/data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(p)) return true;
    if (/!\[[^\]]*\]\([^)]+\)/.test(p)) return true;
    if (/https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?/i.test(p)) return true;
    return false;
  }

  private detectExplicitEthnicity(prompt: string): boolean {
    const p = (prompt || '').toLowerCase();
    return /(african american|afro-american|black (person|people|man|woman|model|models)?|white (person|people|man|woman|model|models)?|caucasian|asian|east asian|south asian|latino|latina|hispanic|middle eastern|arab|indian|nigerian|kenyan|ethiopian|somali)/.test(
      p
    );
  }

  private detectPeopleInPrompt(prompt: string): boolean {
    const p = (prompt || '').toLowerCase();
    return /(person|people|man|woman|boy|girl|child|children|kid|kids|friends?|family|couple|group|crowd|portrait|selfie|model|models|character|characters|face|faces|smile|standing|sitting)/.test(
      p
    );
  }

  private getImageDimensions(aspectRatio?: ImageAspectRatio): { width: number; height: number } {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1536, height: 864 };
      case '9:16':
        return { width: 864, height: 1536 };
      case '4:3':
        return { width: 1152, height: 864 };
      case '1:1':
      default:
        return { width: 1024, height: 1024 };
    }
  }

  async enhancePrompt(basePrompt: string, options?: { hasImage?: boolean }): Promise<string> {
    const trimmed = (basePrompt || '').trim();
    if (!trimmed) return '';

    const cappedPrompt = trimmed.length > 1000 ? trimmed.slice(0, 1000) : trimmed;
    const hasImage = Boolean(options?.hasImage) || this.detectImagesInPrompt(cappedPrompt);
    const hasPeople = this.detectPeopleInPrompt(cappedPrompt);
    const hasExplicitEthnicity = this.detectExplicitEthnicity(cappedPrompt);
    const shouldDefaultToAfricanAmerican = (hasImage || hasPeople) && !hasExplicitEthnicity;

    const systemPromptBase =
      "You are an expert prompt engineer for AI image and video generation models. Your task is to rewrite the user's simple prompt into a highly detailed, descriptive, and artistic prompt suitable for models like Midjourney, Stable Diffusion, or Wan Video. Focus on lighting, artistic style, camera angles, texture, and mood. Output ONLY the enhanced prompt text, without any explanations or conversational filler.";
    const systemPromptAddendum = shouldDefaultToAfricanAmerican
      ? " If the prompt includes people and the user does not specify ethnicity, default the people to African American. Do not override explicit user ethnicity. Keep the output under 1000 characters."
      : " Keep the output under 1000 characters.";
    const systemPrompt = `${systemPromptBase}${systemPromptAddendum}`;

    const messages: Message[] = [{ role: 'user', content: cappedPrompt }];

    // We use a non-streaming approach for simplicity here, 
    // but reusing streamChat is cleaner to keep the codebase consistent.
    let fullResponse = '';
    // Use a fast model for this. Prompt-enhance repeats are intentionally NOT
    // cached (lane B covers real chat requests only).
    const stream = this.streamChat(messages, systemPrompt, 'Qwen/Qwen3-32B-TEE', undefined, null, undefined, undefined, undefined, { cacheEligible: false, logMode: 'prompt_enhance' });

    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        fullResponse += chunk.text;
      }
    }

    const finalPrompt = fullResponse.trim();
    return finalPrompt.length > 1000 ? finalPrompt.slice(0, 1000).trim() : finalPrompt;
  }

  /**
   * Public chat stream (spec §3 lane B wrapper). On an identical repeated
   * request within TTL the cached completion is replayed through THIS same
   * generator, so the UX is identical on the hit path; the hit is observable
   * via `query_cache.hit_count` + a `model_call_log` row with cache_hit=true.
   *
   * opts.cacheEligible: only the normal send path opts in. Branching/
   * regenerate paths (deliberate re-rolls) pass false and never read or write
   * the cache. Only clean, complete, non-empty, secret-free responses are
   * cached (whole assistant responses — never partial streams).
   */
  async *streamChat(
    messages: Message[],
    systemPrompt: string,
    model: string,
    searchConfig?: { enabled: boolean; apiKey: string; provider: 'tavily' | 'brave' },
    toolRuntime?: { executeTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> } | null,
    onToolResult?: (payload: { tool: string; result: Record<string, unknown> }) => void,
    onStatusChange?: (status: string | null) => void,
    signal?: AbortSignal,
    opts?: { cacheEligible?: boolean; logMode?: ModelCallMode }
  ): AsyncGenerator<{ type: 'thinking' | 'content' | 'sources' | 'tool_result' | 'done'; text?: string; sources?: SearchSource[]; tool?: string; result?: Record<string, unknown> }, void, unknown> {
    const logMode: ModelCallMode = opts?.logMode ?? 'chat';
    const cacheParams = {
      searchEnabled: Boolean(searchConfig?.enabled && searchConfig?.provider),
      searchProvider: searchConfig?.provider ?? null,
      hasTools: Boolean(toolRuntime),
      maxTokens: 5000,
      temperature: 1,
    };

    const ctx = getAppUserContext();
    const cacheEligible = Boolean(opts?.cacheEligible) && Boolean(ctx?.userId);

    if (cacheEligible && ctx?.userId) {
      const cached = await getCachedChat({
        userId: ctx.userId,
        model,
        systemPrompt,
        messages: messages as unknown as Array<Record<string, unknown>>,
        params: cacheParams,
      });
      if (cached) {
        yield { type: 'content', text: cached };
        yield { type: 'done' };
        return;
      }
    }

    let fullText = '';
    let sawDone = false;
    for await (const chunk of this.streamChatCore(messages, systemPrompt, model, searchConfig, toolRuntime, onToolResult, onStatusChange, signal, logMode)) {
      if (chunk.type === 'content' && chunk.text) fullText += chunk.text;
      if (chunk.type === 'done') sawDone = true;
      yield chunk;
    }

    if (cacheEligible && sawDone && fullText.trim() && ctx?.userId) {
      await setCachedChat({
        userId: ctx.userId,
        model,
        systemPrompt,
        messages: messages as unknown as Array<Record<string, unknown>>,
        params: cacheParams,
        text: fullText,
      });
    }
  }

  private async *streamChatCore(
    messages: Message[],
    systemPrompt: string,
    model: string,
    searchConfig?: { enabled: boolean; apiKey: string; provider: 'tavily' | 'brave' },
    toolRuntime?: { executeTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>> } | null,
    onToolResult?: (payload: { tool: string; result: Record<string, unknown> }) => void,
    onStatusChange?: (status: string | null) => void,
    signal?: AbortSignal,
    logMode: ModelCallMode = 'chat'
  ): AsyncGenerator<{ type: 'thinking' | 'content' | 'sources' | 'tool_result' | 'done'; text?: string; sources?: SearchSource[]; tool?: string; result?: Record<string, unknown> }, void, unknown> {

    // Setup Tools
    const tools: Record<string, unknown>[] = [];

    // The web_search tool runs whenever search is enabled: API keys (user BYOK
    // or platform) are resolved server-side by the /api/search proxy.
    if (searchConfig?.enabled && searchConfig?.provider) {
      tools.push({
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for real-time information, news, or facts. Use this tool when the user asks about current events.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query."
              }
            },
            required: ["query"]
          }
        }
      });
    }

    if (toolRuntime) {
      tools.push(
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Generate a marketing image from a prompt. Use when the user explicitly requests generating an image now.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "The image prompt to generate." },
                aspectRatio: { type: "string", enum: ["1:1", "16:9", "9:16", "4:3"], description: "Optional aspect ratio." }
              },
              required: ["prompt"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "edit_image",
            description: "Edit an existing image using an instruction prompt and base64 image. Use when the user explicitly requests editing now.",
            parameters: {
              type: "object",
              properties: {
                prompt: { type: "string", description: "The edit instruction." },
                image_b64: { type: "string", description: "The input image as data URL or raw base64." },
                aspectRatio: { type: "string", enum: ["1:1", "16:9", "9:16", "4:3"], description: "Optional aspect ratio." }
              },
              required: ["prompt", "image_b64"]
            }
          }
        }
      );
    }

    const toolsPayload = tools.length > 0 ? tools : undefined;

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const body: Record<string, unknown> = {
      model: model,
      messages: allMessages,
      stream: true,
      max_tokens: 5000,
      temperature: 1,
    };

    if (toolsPayload) {
      body.tools = toolsPayload;
    }

    const response = await this.proxyFetch(BASE_LLM_URL, body, { mode: logMode, model, prompt: this.describePrompt(messages) }, signal);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM Error: ${response.status} - ${errorText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    let currentToolCalls: { id: string; type: string; function: { name: string; arguments: string } }[] = [];
    let sawDone = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') {
            if (!sawDone) {
              sawDone = true;
              yield { type: 'done' };
            }
            break;
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const choice = data.choices[0];
              const delta = choice?.delta;

              // Handle thinking/reasoning tokens
              const reasoningText = delta?.reasoning_content || delta?.reasoning;
              if (reasoningText) {
                yield { type: 'thinking', text: reasoningText };
              }

              // Handle content tokens
              if (delta?.content) {
                yield { type: 'content', text: delta.content };
              }

              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index;
                  if (!currentToolCalls[index]) {
                    currentToolCalls[index] = {
                      id: toolCall.id,
                      type: toolCall.type,
                      function: {
                        name: toolCall.function?.name || '',
                        arguments: toolCall.function?.arguments || ''
                      }
                    };
                  } else {
                    if (toolCall.function?.arguments) {
                      currentToolCalls[index].function.arguments += toolCall.function.arguments;
                    }
                  }
                }
              }

              if (
                (choice?.finish_reason === 'stop' || choice?.finish_reason === 'length') &&
                currentToolCalls.length === 0 &&
                !sawDone
              ) {
                sawDone = true;
                yield { type: 'done' };
                break;
              }

              if (choice?.finish_reason === 'tool_calls' || (choice?.finish_reason === 'stop' && currentToolCalls.length > 0)) {
                const assistantMsg: Message = {
                  role: 'assistant',
                  content: '',
                  tool_calls: currentToolCalls
                };

                const newMessages = [...messages, assistantMsg];

                for (const call of currentToolCalls) {
                  const toolName = call.function.name;
                  const rawArgs = call.function.arguments || '{}';

                  if (toolName === 'web_search') {
                    if (!searchConfig?.enabled || !searchConfig.provider) {
                      newMessages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        name: 'web_search',
                        content: 'Web search is not enabled.'
                      });
                      continue;
                    }

                    const args = JSON.parse(rawArgs);

                    if (onStatusChange) onStatusChange('🔍 Analyzing query...');

                    const searchAgent = new SearchAgent({
                      tavilyApiKey: searchConfig.provider === 'tavily' ? searchConfig.apiKey : undefined,
                      braveApiKey: searchConfig.provider === 'brave' ? searchConfig.apiKey : undefined,
                      preferredProvider: searchConfig.provider,
                    });

                    if (onStatusChange) onStatusChange(`🔍 Searching: "${String(args.query || '').slice(0, 30)}${String(args.query || '').length > 30 ? '...' : ''}"`);
                    const searchContext = await searchAgent.search(args.query);

                    if (onStatusChange) {
                      onStatusChange(SearchAgent.getStatusMessage(searchContext));
                    }

                    const toolResponse = searchContext.synthesizedContext || 'No results found.';

                    if (searchContext.sources && searchContext.sources.length > 0) {
                      yield { type: 'sources', sources: searchContext.sources };
                    }

                    newMessages.push({
                      role: 'tool',
                      tool_call_id: call.id,
                      name: 'web_search',
                      content: toolResponse,
                      sources: searchContext.sources
                    });
                    continue;
                  }

                  if (toolName === 'generate_image' || toolName === 'edit_image') {
                    if (!toolRuntime) {
                      newMessages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        name: toolName,
                        content: 'Tool not available.'
                      });
                      continue;
                    }

                    const args = JSON.parse(rawArgs);
                    if (onStatusChange) {
                      onStatusChange(toolName === 'generate_image' ? '🎨 Generating image...' : '✨ Editing image...');
                    }

                    const result = await toolRuntime.executeTool(toolName, args);

                    if (onToolResult) {
                      onToolResult({ tool: toolName, result });
                    } else {
                      yield { type: 'tool_result', tool: toolName, result };
                    }

                    newMessages.push({
                      role: 'tool',
                      tool_call_id: call.id,
                      name: toolName,
                      content: typeof result === 'string' ? result : JSON.stringify(result)
                    });
                    continue;
                  }

                  newMessages.push({
                    role: 'tool',
                    tool_call_id: call.id,
                    name: toolName,
                    content: `Unsupported tool: ${toolName}`
                  });
                }

                if (onStatusChange) onStatusChange(null);

                yield* this.streamChat(newMessages, systemPrompt, model, searchConfig, toolRuntime, onToolResult, onStatusChange, signal, { cacheEligible: false, logMode });
                return;
              }

            } catch (e) {
              console.warn('Error parsing stream chunk', e);
            }
          }
        }

        if (sawDone) break;
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted');
        return;
      }
      throw error;
    } finally {
      if (sawDone) {
        try {
          await reader.cancel();
        } catch {
          void 0;
        }
      }
      reader.releaseLock();
    }
  }

  async speak(request: TTSRequest): Promise<Blob> {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error("Text is empty");
    }

    const response = await this.proxyFetch(BASE_TTS_URL, {
      text: request.text,
      speed: request.speed,
      voice: request.voice
    }, { mode: 'tts', model: 'audiodojo-speak', prompt: request.text });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async transcribe(request: STTRequest): Promise<string> {
    const response = await this.proxyFetch(BASE_STT_URL, {
      audio_b64: request.audio_b64,
      language: request.language
    }, {
      mode: 'stt',
      model: 'whisper',
      // Binary audio is never persisted — placeholder only (spec §1c).
      prompt: `[audio input]${request.language ? ` (lang=${request.language})` : ''}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STT Error: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (typeof json === 'string') return json;
      if (json.text) return json.text;
      return text;
    } catch {
      return text;
    }
  }

  async generateImage(request: ImageGenRequest, signal?: AbortSignal): Promise<Blob> {
    const { width, height } = this.getImageDimensions(request.aspectRatio);
    let body: Record<string, unknown> = { prompt: request.prompt, width, height };

    // Model Specific Logic (updated for vonkaiser endpoints)
    if (request.modelId === 'qwen-image-2512') {
      body = {
        model: "Qwen-Image-2512",
        prompt: request.prompt,
        negative_prompt: "blur, distortion, low quality",
        guidance_scale: 7.5,
        width,
        height,
        num_inference_steps: 50
      };
    } else if (request.modelId === 'z-image-turbo') {
      // Z-Image Turbo does NOT accept width/height params
      body = {
        prompt: request.prompt
      };
    } else if (request.modelId === 'flux') {
      // ImageClassic bundle — FLUX.1 schnell (1-4 steps, no negative prompt needed)
      body = {
        model: "flux",
        prompt: request.prompt,
        width,
        height,
        seed: null,
        num_inference_steps: 4
      };
    } else if (['dreamshaper', 'ilustmix', 'juggernaut'].includes(request.modelId || '')) {
      // ImageClassic bundle — SDXL models (25 steps, supports negative prompt)
      body = {
        model: request.modelId,
        prompt: request.prompt,
        negative_prompt: "blur, distortion, low quality, ugly, deformed",
        guidance_scale: 7.5,
        width,
        height,
        seed: null,
        num_inference_steps: 25
      };
    } else if (!request.modelId && request.modelUrl) {
      // Custom Model Fallback "Smart Payload"
      body = {
        prompt: request.prompt,
        model: "custom",
        width,
        height,
        guidance_scale: 7.5,
        num_inference_steps: 40,
        negative_prompt: "blur, low quality"
      };
    }

    const response = await this.proxyFetch(request.modelUrl, body, { mode: 'image', model: request.modelId || modelFromUrl(request.modelUrl), prompt: request.prompt }, signal);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image Gen Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async editImage(request: ImageEditRequest, signal?: AbortSignal): Promise<Blob> {
    let cleanImage = request.image_b64;
    if (cleanImage.includes('base64,')) {
      cleanImage = cleanImage.split('base64,')[1];
    }

    const { width, height } = this.getImageDimensions(request.aspectRatio);
    const body = {
      seed: null,
      width,
      height,
      prompt: request.prompt,
      image_b64s: [cleanImage],
      true_cfg_scale: 4,
      negative_prompt: "",
      num_inference_steps: 40
    };

    const response = await this.proxyFetch(request.modelUrl, body, { mode: 'image_edit', model: modelFromUrl(request.modelUrl), prompt: request.prompt }, signal);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image Edit Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async editImageAdvanced(request: ImageEditRequest, signal?: AbortSignal): Promise<Blob> {
    let cleanImage = request.image_b64;
    if (cleanImage.includes('base64,')) {
      cleanImage = cleanImage.split('base64,')[1];
    }

    // Build prompt based on edit mode
    let finalPrompt = request.prompt;
    const mode = request.editMode || 'smart';
    const stylePreset = request.stylePreset;

    if (mode === 'remove_bg') {
      finalPrompt = 'Remove the background from this image, keep only the subject, make background transparent or white.';
    } else if (mode === 'upscale') {
      finalPrompt = 'Upscale this image to higher resolution, enhance details, make it crisp, sharp and clear with no artifacts.';
    } else if (mode === 'style_transfer' && stylePreset) {
      const styleMap: Record<string, string> = {
        cyberpunk: 'Apply cyberpunk style: neon lights, dark atmosphere, blue/pink color scheme, futuristic',
        oil_painting: 'Apply oil painting style: thick brush strokes, rich textures, artistic, classical painting look',
        sketch: 'Apply sketch style: pencil drawing, black and white, line art, hand-drawn look',
        anime: 'Apply anime style: cel-shaded, vibrant colors, Japanese animation aesthetic, clean lines',
        vintage: 'Apply vintage style: sepia tones, retro, old photograph look, film grain',
        neon: 'Apply neon style: glowing neon lines, dark background, bright fluorescent colors, 80s aesthetic',
      };
      finalPrompt = `${styleMap[stylePreset] || 'Apply artistic style'}. ${request.prompt || ''}`.trim();
    }

    const { width, height } = this.getImageDimensions(request.aspectRatio);
    const body = {
      seed: null,
      width,
      height,
      prompt: finalPrompt,
      image_b64s: [cleanImage],
      true_cfg_scale: 4,
      negative_prompt: "",
      num_inference_steps: mode === 'remove_bg' ? 30 : mode === 'upscale' ? 50 : 40
    };

    const response = await this.proxyFetch(request.modelUrl, body, {
      mode: 'image_edit',
      model: modelFromUrl(request.modelUrl),
      prompt: `[${mode}${stylePreset ? `/${stylePreset}` : ''}] ${finalPrompt}`
    }, signal);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image Edit Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async generateVideo(
    request: VideoGenRequest,
    signal?: AbortSignal,
    onRetry?: (retryNumber: number, maxRetries: number) => void
  ): Promise<Blob> {
    let body: Record<string, unknown> = {};

    if (isLtx25Model(request.modelId)) {
      if (!request.ltx25Params) {
        throw new Error("LTX 2.5 model selected but no settings provided");
      }
      const { settings, videoUrl, keyframeStart, keyframeEnd } = request.ltx25Params;
      body = buildLtx25GenerationInput(
        request.prompt,
        settings,
        request.image,
        videoUrl,
        keyframeStart,
        keyframeEnd
      );
    } else if (request.modelId === 'wan-2.1-t2v') {
      body = {
        prompt: request.prompt,
        seed: 42,
        sample_shift: null,
        single_frame: false,
        guidance_scale: 5
      };
    } else {
      let cleanImage = request.image || '';
      if (cleanImage.includes('base64,')) {
        cleanImage = cleanImage.split('base64,')[1];
      }
      body = {
        prompt: request.prompt,
        image_b64: cleanImage
      };
    }

    const response = await this.loggedCall(
      { mode: 'video', model: request.modelId || modelFromUrl(request.modelUrl), prompt: request.prompt },
      () =>
        fetchWithRetry(
          PROXY_URL,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: request.modelUrl, body, userKey: this.userKey }),
          },
          { signal, onRetry }
        )
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video Gen Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async generateLipSync(request: MuseTalkLipSyncRequest, signal?: AbortSignal): Promise<Blob> {
    const cleanInput = (value: string): string => {
      if (!value) return value;
      if (/^https?:\/\//i.test(value)) return value;
      if (value.includes('base64,')) return value.split('base64,')[1] || '';
      return value;
    };

    const payload = {
      fps: request.fps ?? 25,
      batch_size: request.batch_size ?? 8,
      audio_input: cleanInput(request.audio_input),
      video_input: cleanInput(request.video_input),
      extra_margin: request.extra_margin ?? 10,
      parsing_mode: request.parsing_mode ?? 'jaw',
      left_cheek_width: request.left_cheek_width ?? 90,
      right_cheek_width: request.right_cheek_width ?? 90
    };

    const doRequest = async (body: unknown) => {
      return this.proxyFetch(request.modelUrl || BASE_MUSETALK_URL, body, {
        mode: 'lip_sync',
        model: modelFromUrl(request.modelUrl) || 'musetalk',
        // Binary video/audio inputs are never persisted — placeholder only.
        prompt: '[video+audio inputs]'
      }, signal);
    };

    let response = await doRequest(payload);

    if (!response.ok) {
      const errorText = await response.text();
      const shouldRetryWithWrappedArgs =
        response.status === 400 || response.status === 404 || response.status === 422 || /input_args/i.test(errorText);

      if (shouldRetryWithWrappedArgs) {
        response = await doRequest({ input_args: payload });
      } else {
        throw new Error(`Lip Sync Error: ${response.status} - ${errorText}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lip Sync Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }
}
