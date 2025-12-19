
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
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: query,
          search_depth: "basic",
          include_answer: true,
          max_results: 3
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API returned ${response.status}`);
      }

      const data = await response.json();
      
      const results = data.results.map((r: any) => 
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
      // Direct call to Brave API usually fails in browser due to CORS.
      // We route through a CORS proxy for this client-side application.
      const targetUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey
        }
      });

      if (!response.ok) {
        // Handle 403 (Invalid Key) specifically
        if (response.status === 403) return "Error: Invalid Brave Search API Key.";
        throw new Error(`Brave API returned ${response.status}`);
      }

      const data = await response.json();
      
      // Check if 'web' and 'results' exist
      const results = data.web?.results?.map((r: any) => 
        `Title: ${r.title}\nURL: ${r.url}\nDescription: ${r.description}`
      ).join('\n\n');

      return results ? `Search Results for "${query}":\n\n${results}` : "No results found.";
    } catch (error) {
      console.error("Brave Search Error:", error);
      // Even with proxy, things can fail
      return `Error performing search with Brave: ${(error as Error).message}`;
    }
  }
}