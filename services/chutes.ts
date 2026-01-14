
import { Message, TTSRequest, STTRequest, ImageGenRequest, VideoGenRequest, ImageEditRequest, SearchSource, ImageAspectRatio } from '../types';
import { SearchAgent } from './searchAgent';

const BASE_LLM_URL = 'https://llm.chutes.ai/v1/chat/completions';
const BASE_TTS_URL = 'https://chutes-kokoro.chutes.ai/speak';
const BASE_STT_URL = 'https://chutes-whisper-large-v3.chutes.ai/transcribe';

export class ChutesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    let key = this.apiKey;
    if (!key || key === 'internal') {
      key = import.meta.env.VITE_CHUTES_API_KEY || '';
    }
    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
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

    const systemPromptBase =
      "You are an expert prompt engineer for AI image and video generation models. Your task is to rewrite the user's simple prompt into a highly detailed, descriptive, and artistic prompt suitable for models like Midjourney, Stable Diffusion, or Wan Video. Focus on lighting, artistic style, camera angles, texture, and mood. Output ONLY the enhanced prompt text, without any explanations or conversational filler.";
    const systemPromptAddendum = hasImage
      ? " When an image is provided or referenced, default any depicted people to African American unless the user explicitly requests otherwise. Keep the output under 1000 characters."
      : " Keep the output under 1000 characters.";
    const systemPrompt = `${systemPromptBase}${systemPromptAddendum}`;

    const messages: Message[] = [{ role: 'user', content: cappedPrompt }];

    // We use a non-streaming approach for simplicity here, 
    // but reusing streamChat is cleaner to keep the codebase consistent.
    let fullResponse = '';
    // Use a fast model for this
    const stream = this.streamChat(messages, systemPrompt, 'NousResearch/DeepHermes-3-Mistral-24B-Preview');

    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        fullResponse += chunk.text;
      }
    }

    const finalPrompt = fullResponse.trim();
    return finalPrompt.length > 1000 ? finalPrompt.slice(0, 1000).trim() : finalPrompt;
  }

  async *streamChat(
    messages: Message[],
    systemPrompt: string,
    model: string,
    searchConfig?: { enabled: boolean; apiKey: string; provider: 'tavily' | 'brave' },
    onStatusChange?: (status: string | null) => void,
    signal?: AbortSignal
  ): AsyncGenerator<{ type: 'thinking' | 'content' | 'sources'; text?: string; sources?: SearchSource[] }, void, unknown> {

    // Setup Tools
    const tools = (searchConfig?.enabled && searchConfig?.apiKey && searchConfig.apiKey.length > 5) ? [
      {
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
      }
    ] : undefined;

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const body: any = {
      model: model,
      messages: allMessages,
      stream: true,
      max_tokens: 5000,
      temperature: 1,
    };

    if (tools) {
      body.tools = tools;
    }

    const response = await this.fetchWithRetry(BASE_LLM_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM Error: ${response.status} - ${errorText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    let currentToolCalls: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') break;
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

              if (choice?.finish_reason === 'tool_calls' || (choice?.finish_reason === 'stop' && currentToolCalls.length > 0)) {
                if (onStatusChange) onStatusChange('🔍 Analyzing query...');

                // Use intelligent SearchAgent instead of basic SearchService
                const searchAgent = new SearchAgent({
                  tavilyApiKey: searchConfig!.provider === 'tavily' ? searchConfig!.apiKey : undefined,
                  braveApiKey: searchConfig!.provider === 'brave' ? searchConfig!.apiKey : undefined,
                  preferredProvider: searchConfig!.provider,
                });

                const assistantMsg: Message = {
                  role: 'assistant',
                  content: '',
                  tool_calls: currentToolCalls
                };

                const newMessages = [...messages, assistantMsg];

                for (const call of currentToolCalls) {
                  if (call.function.name === 'web_search') {
                    const args = JSON.parse(call.function.arguments);

                    // Use SearchAgent for intelligent search
                    if (onStatusChange) onStatusChange(`🔍 Searching: "${args.query.slice(0, 30)}${args.query.length > 30 ? '...' : ''}"`);
                    const searchContext = await searchAgent.search(args.query);

                    if (onStatusChange) {
                      onStatusChange(SearchAgent.getStatusMessage(searchContext));
                    }

                    // Use synthesized context with citations
                    const toolResponse = searchContext.synthesizedContext || 'No results found.';

                    // Yield sources to UI
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
                  }
                }

                if (onStatusChange) onStatusChange(null);

                yield* this.streamChat(newMessages, systemPrompt, model, searchConfig, onStatusChange, signal);
                return;
              }

            } catch (e) {
              console.warn('Error parsing stream chunk', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
        return;
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  async speak(request: TTSRequest): Promise<Blob> {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error("Text is empty");
    }

    const response = await this.fetchWithRetry(BASE_TTS_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        text: request.text,
        speed: request.speed,
        voice: request.voice
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async transcribe(request: STTRequest): Promise<string> {
    const response = await this.fetchWithRetry(BASE_STT_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        audio_b64: request.audio_b64,
        language: request.language
      }),
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
    let body: any = { prompt: request.prompt, width, height };

    // Model Specific Logic
    if (request.modelId === 'qwen-image-2.5-12b') {
      body = {
        model: "Qwen-Image-2512",
        prompt: request.prompt,
        negative_prompt: "blur, distortion, low quality",
        guidance_scale: 7.5,
        width,
        height,
        num_inference_steps: 50
      };
    } else if (request.modelId === 'qwen-image') {
      body = {
        model: "qwen-image",
        prompt: request.prompt,
        negative_prompt: "blur, distortion, low quality, ugly, deformed",
        guidance_scale: 7.5,
        width,
        height,
        num_inference_steps: 50
      };
    } else if (request.modelId === 'juggernaut-xl') {
      body = {
        model: "JuggernautXL-Ragnarok",
        prompt: request.prompt,
        negative_prompt: "blur, distortion, low quality, ugly, deformed",
        guidance_scale: 7.5,
        width,
        height,
        num_inference_steps: 50
      };
    } else if (request.modelId === 'flux-schnell') {
      body = {
        model: "FLUX.1-schnell",
        prompt: request.prompt,
        negative_prompt: "blur, distortion, low quality, ugly, deformed",
        guidance_scale: 7.5,
        width,
        height,
        num_inference_steps: 50
      };
    } else if (request.modelId === 'hidream') {
      body = {
        seed: null,
        prompt: request.prompt,
        width,
        height,
        resolution: `${width}x${height}`,
        guidance_scale: 5,
        num_inference_steps: 50
      };
    } else if (!request.modelId && request.modelUrl) {
      // Custom Model Fallback "Smart Payload"
      // We try to send a superset of common fields. 
      // Most well-behaved APIs will ignore extra fields.
      body = {
        prompt: request.prompt,
        model: "custom", // Some APIs require this field to be present
        width,
        height,
        resolution: `${width}x${height}`,
        guidance_scale: 7.5,
        num_inference_steps: 40,
        negative_prompt: "blur, low quality"
      };
    }

    const response = await this.fetchWithRetry(request.modelUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal
    });

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

    const response = await this.fetchWithRetry(request.modelUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image Edit Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }

  async generateVideo(request: VideoGenRequest, signal?: AbortSignal): Promise<Blob> {
    let body: any = {};

    if (request.modelId === 'wan-2.1-t2v') {
      // Text to Video Logic
      body = {
        prompt: request.prompt,
        seed: 42,
        sample_shift: null,
        single_frame: false,
        guidance_scale: 5
      };
    } else {
      // Default / I2V Logic (Wan 2.2 I2V)
      let cleanImage = request.image || '';
      if (cleanImage.includes('base64,')) {
        cleanImage = cleanImage.split('base64,')[1];
      }

      body = {
        prompt: request.prompt,
        image: cleanImage,
        frames: 81,
        resolution: "480p",
        seed: null,
        negative_prompt: "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",
        guidance_scale_2: 1
      };
    }

    const response = await this.fetchWithRetry(request.modelUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video Gen Error: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  }
}
