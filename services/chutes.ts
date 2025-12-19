
import { Message, TTSRequest, STTRequest, ImageGenRequest, VideoGenRequest, ImageEditRequest } from '../types';
import { SearchService } from './search';

const BASE_LLM_URL = 'https://llm.chutes.ai/v1/chat/completions';
const BASE_TTS_URL = 'https://chutes-kokoro.chutes.ai/speak';
const BASE_STT_URL = 'https://chutes-whisper-large-v3.chutes.ai/transcribe';

export class ChutesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
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

  async enhancePrompt(basePrompt: string): Promise<string> {
    if (!basePrompt.trim()) return "";
    
    const systemPrompt = "You are an expert prompt engineer for AI image and video generation models. Your task is to rewrite the user's simple prompt into a highly detailed, descriptive, and artistic prompt suitable for models like Midjourney, Stable Diffusion, or Wan Video. Focus on lighting, artistic style, camera angles, texture, and mood. Output ONLY the enhanced prompt text, without any explanations or conversational filler.";
    
    const messages: Message[] = [{ role: 'user', content: basePrompt }];
    
    // We use a non-streaming approach for simplicity here, 
    // but reusing streamChat is cleaner to keep the codebase consistent.
    let fullResponse = '';
    // Use a fast model for this
    const stream = this.streamChat(messages, systemPrompt, 'meituan-longcat/LongCat-Flash-Chat-FP8');
    
    for await (const chunk of stream) {
        fullResponse += chunk;
    }
    
    return fullResponse.trim();
  }

  async *streamChat(
    messages: Message[], 
    systemPrompt: string, 
    model: string,
    searchConfig?: { enabled: boolean; apiKey: string; provider: 'tavily' | 'brave' },
    onStatusChange?: (status: string | null) => void,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    
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
      max_tokens: 8192,
      temperature: 0.7,
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
              
              if (delta?.content) {
                yield delta.content;
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
                if (onStatusChange) onStatusChange('Searching web...');
                
                const searchService = new SearchService(searchConfig!.apiKey, searchConfig!.provider);
                
                const assistantMsg: Message = {
                  role: 'assistant',
                  content: '',
                  tool_calls: currentToolCalls
                };
                
                const newMessages = [...messages, assistantMsg];

                for (const call of currentToolCalls) {
                  if (call.function.name === 'web_search') {
                    const args = JSON.parse(call.function.arguments);
                    const searchResult = await searchService.search(args.query);
                    
                    newMessages.push({
                      role: 'tool',
                      tool_call_id: call.id,
                      name: 'web_search',
                      content: searchResult
                    });
                  }
                }

                if (onStatusChange) onStatusChange(null);

                yield *this.streamChat(newMessages, systemPrompt, model, searchConfig, onStatusChange, signal);
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
    let body: any = { prompt: request.prompt };
    
    // Model Specific Logic
    if (request.modelId === 'qwen-image') {
        body = {
            model: "qwen-image",
            prompt: request.prompt,
            negative_prompt: "blur, distortion, low quality, ugly, deformed",
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
            num_inference_steps: 50
        };
    } else if (request.modelId === 'juggernaut-xl') {
        body = {
            model: "JuggernautXL-Ragnarok",
            prompt: request.prompt,
            negative_prompt: "blur, distortion, low quality, ugly, deformed",
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
            num_inference_steps: 50
        };
    } else if (request.modelId === 'flux-schnell') {
        body = {
            model: "FLUX.1-schnell",
            prompt: request.prompt,
            negative_prompt: "blur, distortion, low quality, ugly, deformed",
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
            num_inference_steps: 50
        };
    } else if (request.modelId === 'hidream') {
        body = {
            seed: null,
            prompt: request.prompt,
            resolution: "1024x1024",
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
            width: 1024,
            height: 1024,
            resolution: "1024x1024",
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

    const body = {
        prompt: request.prompt,
        image_b64s: [cleanImage],
        true_cfg_scale: 4,
        num_inference_steps: 40,
        width: 1024,
        height: 1024,
        seed: null,
        negative_prompt: ""
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
