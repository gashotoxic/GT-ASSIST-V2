/**
 * Search Agent - Intelligent Web Grounding System
 * 
 * A sophisticated search orchestration layer that:
 * - Analyzes queries to determine optimal search strategy
 * - Executes multi-provider searches with fallback
 * - Synthesizes results into LLM-ready context with citations
 * - Provides clean source metadata for UI rendering
 */

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
    title: string;
    url: string;
    content: string;
    snippet: string;
    favicon?: string;
    publishedDate?: string;
    score?: number;
}

import { SearchSource } from '../types';

export interface SearchContext {
    query: string;
    originalQuery: string;
    strategy: SearchStrategy;
    results: SearchResult[];
    synthesizedContext: string;
    sources: SearchSource[];
    searchTime: number;
    error?: string;
}

export type SearchStrategy = 'quick' | 'comprehensive' | 'news' | 'research';

export interface SearchAgentConfig {
    tavilyApiKey?: string;
    braveApiKey?: string;
    preferredProvider: 'tavily' | 'brave';
    maxResults?: number;
}

// =============================================================================
// Query Analysis Patterns
// =============================================================================

const NEWS_PATTERNS = [
    /\b(today|yesterday|this week|this month|recent|latest|breaking|news|update)\b/i,
    /\b(2024|2025|2026|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b(announced|released|launched|happened|occurred)\b/i,
];

const RESEARCH_PATTERNS = [
    /\b(explain|how does|what is|why do|compare|difference between|pros and cons)\b/i,
    /\b(guide|tutorial|learn|understand|comprehensive)\b/i,
    /\b(best practices|methodology|research|study|analysis)\b/i,
];

const QUICK_PATTERNS = [
    /\b(who is|what is the|when did|where is|how much|how many)\b/i,
    /\b(definition|meaning|capital of|population of|age of)\b/i,
];

// =============================================================================
// Search Agent Class
// =============================================================================

export class SearchAgent {
    private config: SearchAgentConfig;

    constructor(config: SearchAgentConfig) {
        this.config = {
            ...config,
            maxResults: config.maxResults || 5,
        };
    }

    // ===========================================================================
    // Main Search Entry Point
    // ===========================================================================

    /**
     * Execute an intelligent search with query analysis and result synthesis
     */
    async search(query: string): Promise<SearchContext> {
        const startTime = Date.now();

        // Step 1: Analyze query to determine strategy
        const strategy = this.analyzeQuery(query);

        // Step 2: Optimize query based on strategy
        const optimizedQuery = this.optimizeQuery(query, strategy);

        // Step 3: Execute search with fallback
        let results: SearchResult[] = [];
        let error: string | undefined;

        try {
            results = await this.executeSearch(optimizedQuery, strategy);
        } catch (e) {
            error = (e as Error).message;
            console.error('Search failed:', e);
        }

        // Step 4: Deduplicate and rank results
        const processedResults = this.processResults(results);

        // Step 5: Extract sources for UI
        const sources = this.extractSources(processedResults);

        // Step 6: Synthesize context for LLM
        const synthesizedContext = this.synthesizeContext(processedResults, sources);

        const searchTime = Date.now() - startTime;

        return {
            query: optimizedQuery,
            originalQuery: query,
            strategy,
            results: processedResults,
            synthesizedContext,
            sources,
            searchTime,
            error,
        };
    }

    // ===========================================================================
    // Query Analysis
    // ===========================================================================

    /**
     * Analyze query to determine the best search strategy
     */
    analyzeQuery(query: string): SearchStrategy {
        const queryLower = query.toLowerCase();

        // Check for news/current events
        if (NEWS_PATTERNS.some(pattern => pattern.test(query))) {
            return 'news';
        }

        // Check for quick factual queries
        if (QUICK_PATTERNS.some(pattern => pattern.test(query))) {
            return 'quick';
        }

        // Check for research/in-depth queries
        if (RESEARCH_PATTERNS.some(pattern => pattern.test(query))) {
            return 'research';
        }

        // Default to comprehensive
        return 'comprehensive';
    }

    /**
     * Optimize query based on search strategy
     */
    private optimizeQuery(query: string, strategy: SearchStrategy): string {
        let optimized = query.trim();

        // Remove conversational filler
        optimized = optimized
            .replace(/^(can you|could you|please|i want to know|tell me)\s+/i, '')
            .replace(/\s+(please|thanks|thank you)$/i, '');

        // Add context for specific strategies
        switch (strategy) {
            case 'news':
                // Don't modify news queries, keep them fresh
                break;
            case 'research':
                // Add depth indicators if not present
                if (!optimized.includes('guide') && !optimized.includes('explain')) {
                    optimized += ' comprehensive guide';
                }
                break;
            case 'quick':
                // Keep it short and direct
                break;
            default:
                break;
        }

        return optimized;
    }

    // ===========================================================================
    // Search Execution
    // ===========================================================================

    /**
     * Execute search with provider fallback
     */
    private async executeSearch(query: string, strategy: SearchStrategy): Promise<SearchResult[]> {
        const maxResults = strategy === 'research' ? 8 : strategy === 'quick' ? 3 : 5;

        // Try preferred provider first. Keys may be user-supplied (BYOK) or
        // platform keys held server-side by the /api/search proxy, so provider
        // availability is decided by the proxy, not by local key presence.
        try {
            if (this.config.preferredProvider === 'tavily') {
                return await this.searchTavily(query, maxResults, strategy);
            }
            return await this.searchBrave(query, maxResults);
        } catch (primaryError) {
            console.warn(`Primary search (${this.config.preferredProvider}) failed:`, primaryError);
        }

        // Fallback to other provider
        try {
            if (this.config.preferredProvider === 'tavily') {
                return await this.searchBrave(query, maxResults);
            }
            return await this.searchTavily(query, maxResults, strategy);
        } catch (fallbackError) {
            console.warn('Fallback search failed:', fallbackError);
            throw new Error(`All search providers failed: ${fallbackError instanceof Error ? fallbackError.message : 'unknown error'}`);
        }
    }

    /**
     * Search using Tavily API (via the server-side /api/search proxy, which
     * injects the API key so it never reaches the browser)
     */
    private async searchTavily(query: string, maxResults: number, strategy: SearchStrategy): Promise<SearchResult[]> {
        const searchDepth = strategy === 'research' ? 'advanced' : 'basic';

        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: 'tavily',
                query,
                searchDepth,
                maxResults,
                userKey: this.config.tavilyApiKey || undefined,
            }),
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data = await response.json();

        return data.results.map((r: Record<string, unknown>, index: number) => ({
            title: (r.title as string) || 'Untitled',
            url: r.url as string,
            content: (r.content as string) || (r.raw_content as string) || '',
            snippet: ((r.content as string) || '').slice(0, 200),
            publishedDate: r.published_date as string,
            score: (r.score as number) || (1 - index * 0.1),
        }));
    }

    /**
     * Search using Brave API (via the server-side /api/search proxy, which
     * injects the API key so it never reaches the browser)
     */
    private async searchBrave(query: string, maxResults: number): Promise<SearchResult[]> {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: 'brave',
                query,
                maxResults,
                userKey: this.config.braveApiKey || undefined,
            }),
        });

        if (!response.ok) {
            throw new Error(`Brave API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.web?.results) {
            return [];
        }

        return data.web.results.map((r: Record<string, unknown>, index: number) => ({
            title: (r.title as string) || 'Untitled',
            url: r.url as string,
            content: (r.description as string) || '',
            snippet: ((r.description as string) || '').slice(0, 200),
            favicon: (r.profile as Record<string, unknown>)?.img as string,
            score: 1 - index * 0.1,
        }));
    }

    // ===========================================================================
    // Result Processing
    // ===========================================================================

    /**
     * Process and deduplicate results
     */
    private processResults(results: SearchResult[]): SearchResult[] {
        // Remove duplicates by URL
        const seen = new Set<string>();
        const unique = results.filter(r => {
            const domain = this.extractDomain(r.url);
            if (seen.has(domain)) return false;
            seen.add(domain);
            return true;
        });

        // Sort by score
        return unique.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    /**
     * Extract source metadata for UI
     */
    private extractSources(results: SearchResult[]): SearchSource[] {
        return results.map((r, index) => ({
            index: index + 1,
            title: r.title,
            url: r.url,
            domain: this.extractDomain(r.url),
            favicon: r.favicon || `https://www.google.com/s2/favicons?domain=${this.extractDomain(r.url)}&sz=32`,
        }));
    }

    /**
     * Extract domain from URL
     */
    private extractDomain(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    // ===========================================================================
    // Context Synthesis
    // ===========================================================================

    /**
     * Synthesize results into LLM-ready context with inline citations
     */
    synthesizeContext(results: SearchResult[], sources: SearchSource[]): string {
        if (results.length === 0) {
            return '';
        }

        // Build context with numbered citations
        const contextParts = results.map((r, index) => {
            const citation = `[${index + 1}]`;
            const content = this.cleanContent(r.content);
            return `${citation} ${r.title}\n${content}`;
        });

        // Build source reference block
        const sourceBlock = sources
            .map(s => `[${s.index}] ${s.domain}: ${s.url}`)
            .join('\n');

        return `
=== WEB SEARCH RESULTS ===
Use the numbered citations [1], [2], etc. when referencing this information in your response.

${contextParts.join('\n\n---\n\n')}

=== SOURCES ===
${sourceBlock}

=== END WEB SEARCH ===
`.trim();
    }

    /**
     * Clean and truncate content for context
     */
    private cleanContent(content: string): string {
        return content
            .replace(/\s+/g, ' ')
            .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable chars
            .trim()
            .slice(0, 500); // Limit per-source content
    }

    // ===========================================================================
    // Utility Methods
    // ===========================================================================

    /**
     * Format search time for display
     */
    static formatSearchTime(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    /**
     * Generate a brief summary for UI status
     */
    static getStatusMessage(context: SearchContext): string {
        if (context.error) {
            return `Search failed: ${context.error}`;
        }
        if (context.results.length === 0) {
            return 'No results found';
        }
        return `Found ${context.results.length} sources in ${this.formatSearchTime(context.searchTime)}`;
    }
}
