import { validateTavilyResponse, validateBraveResponse } from './toolOutputValidation';

export class SearchService {
  private apiKey: string;
  private provider: 'tavily' | 'brave';

  constructor(apiKey: string, provider: 'tavily' | 'brave') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async search(query: string): Promise<string> {
    if (this.provider === 'tavily') {
      return this.searchTavily(query);
    } else {
      return this.searchBrave(query);
    }
  }

  private async searchTavily(query: string): Promise<string> {
    try {
      // Via the server-side /api/search proxy: the API key (BYOK or platform)
      // is injected there and never reaches the browser or third parties.
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'tavily',
          query,
          searchDepth: 'basic',
          maxResults: 3,
          userKey: this.apiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API returned ${response.status}`);
      }

      const data = await response.json();

      // Fail closed on malformed provider output (tier1: toolOutputsValidated).
      const validated = validateTavilyResponse(data);
      if (!validated.ok) {
        throw new Error(`Tavily response failed schema validation: ${validated.errors.join('; ')}`);
      }

      const results = validated.value.map((r) =>
        `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
      ).join('\n\n');

      return `Search Results for "${query}":\n\n${results}`;
    } catch (error) {
      console.error("Tavily Search Error:", error);
      return "Error performing search with Tavily. Please check the API Key.";
    }
  }

  private async searchBrave(query: string): Promise<string> {
    try {
      // Via the server-side /api/search proxy: the API key (BYOK or platform)
      // is injected there and never reaches the browser or third parties.
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'brave',
          query,
          maxResults: 3,
          userKey: this.apiKey || undefined,
        }),
      });

      if (!response.ok) {
        // Handle 403 (Invalid Key) specifically
        if (response.status === 403) return "Error: Invalid Brave Search API Key.";
        throw new Error(`Brave API returned ${response.status}`);
      }

      const data = await response.json();

      // Fail closed on malformed provider output (tier1: toolOutputsValidated).
      const validated = validateBraveResponse(data);
      if (!validated.ok) {
        throw new Error(`Brave response failed schema validation: ${validated.errors.join('; ')}`);
      }

      const results = validated.value.map((r) =>
        `Title: ${r.title}\nURL: ${r.url}\nDescription: ${r.content}`
      ).join('\n\n');

      return results ? `Search Results for "${query}":\n\n${results}` : "No results found.";
    } catch (error) {
      console.error("Brave Search Error:", error);
      // Even with proxy, things can fail
      return `Error performing search with Brave: ${(error as Error).message}`;
    }
  }
}