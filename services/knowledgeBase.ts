/**
 * Knowledge Base Service
 * Handles document ingestion, chunking, embedding, and semantic search for RAG
 */

import { AppSettings } from '../types';
import { validateEmbeddingResponse, validateKnowledgeResults, formatErrors } from './toolOutputValidation';
import { getCachedKnowledge, setCachedKnowledge } from './queryCache';
import { logModelCall } from './modelCallLog';

// =============================================================================
// Types
// =============================================================================

export interface KnowledgeDocument {
    id: string;
    user_id: string;
    filename: string;
    file_type: string;
    file_size: number;
    chunk_count: number;
    status: 'processing' | 'ready' | 'error';
    error_message?: string;
    created_at: string;
    updated_at: string;
    metadata: Record<string, any>;
}

export interface KnowledgeChunk {
    id: string;
    document_id: string;
    content: string;
    chunk_index: number;
    token_count: number;
}

export interface SearchResult {
    id: string;
    document_id: string;
    filename: string;
    content: string;
    chunk_index: number;
    similarity: number;
}

export interface IngestionProgress {
    stage: 'reading' | 'chunking' | 'embedding' | 'storing' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
}

// =============================================================================
// Constants
// =============================================================================

const CHUNK_SIZE = 500; // tokens (approx 2000 chars)
const CHUNK_OVERLAP = 50; // tokens overlap between chunks
const CHARS_PER_TOKEN = 4; // rough estimate

// Chutes embedding endpoint (uses OpenAI-compatible model)
const EMBEDDING_URL = 'https://llm.chutes.ai/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-ada-002';

// =============================================================================
// Knowledge Base Service
// =============================================================================

export class KnowledgeBaseService {
    private supabaseUrl: string;
    private supabaseKey: string;
    private chutesApiKey: string;

    constructor(settings: AppSettings) {
        this.supabaseUrl = settings.supabaseUrl || import.meta.env.VITE_APP_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
        this.supabaseKey = settings.supabaseKey || import.meta.env.VITE_APP_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_KEY || '';
        this.chutesApiKey = settings.apiKey || '';
    }

    // ===========================================================================
    // Document Management
    // ===========================================================================

    /**
     * Get all documents for a user
     */
    async getDocuments(userId: string, accessToken: string): Promise<KnowledgeDocument[]> {
        const response = await fetch(
            `${this.supabaseUrl}/rest/v1/knowledge_documents?user_id=eq.${userId}&order=created_at.desc`,
            {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }

        return response.json();
    }

    /**
     * Delete a document and all its chunks
     */
    async deleteDocument(documentId: string, accessToken: string): Promise<void> {
        const response = await fetch(
            `${this.supabaseUrl}/rest/v1/knowledge_documents?id=eq.${documentId}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to delete document');
        }
    }

    // ===========================================================================
    // Document Ingestion Pipeline
    // ===========================================================================

    /**
     * Ingest a document: read, chunk, embed, and store
     */
    async ingestDocument(
        file: File,
        userId: string,
        accessToken: string,
        onProgress?: (progress: IngestionProgress) => void
    ): Promise<KnowledgeDocument> {
        const reportProgress = (stage: IngestionProgress['stage'], progress: number, message: string) => {
            onProgress?.({ stage, progress, message });
        };

        try {
            // Step 1: Create document record
            reportProgress('reading', 10, 'Creating document record...');
            const docRecord = await this.createDocumentRecord(file, userId, accessToken);

            // Step 2: Read file content
            reportProgress('reading', 20, 'Reading file content...');
            const text = await this.readFileContent(file);

            // Step 3: Chunk the text
            reportProgress('chunking', 30, 'Splitting into chunks...');
            const chunks = this.chunkText(text);

            // Step 4: Generate embeddings
            reportProgress('embedding', 40, `Generating embeddings for ${chunks.length} chunks...`);
            const embeddings = await this.embedChunks(chunks, (p) => {
                reportProgress('embedding', 40 + (p * 0.4), `Embedding chunk ${Math.floor(p * chunks.length)}/${chunks.length}...`);
            });

            // Step 5: Store chunks with embeddings
            reportProgress('storing', 85, 'Storing in knowledge base...');
            await this.storeChunks(docRecord.id, userId, chunks, embeddings, accessToken);

            // Step 6: Update document status
            reportProgress('complete', 95, 'Finalizing...');
            const finalDoc = await this.updateDocumentStatus(docRecord.id, 'ready', accessToken, chunks.length);

            reportProgress('complete', 100, 'Document ingested successfully!');
            return finalDoc;

        } catch (error) {
            reportProgress('error', 0, `Error: ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Create initial document record in database
     */
    private async createDocumentRecord(file: File, userId: string, accessToken: string): Promise<KnowledgeDocument> {
        const fileType = this.getFileType(file.name);

        const response = await fetch(
            `${this.supabaseUrl}/rest/v1/knowledge_documents`,
            {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    user_id: userId,
                    filename: file.name,
                    file_type: fileType,
                    file_size: file.size,
                    status: 'processing',
                }),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to create document record');
        }

        const [doc] = await response.json();
        return doc;
    }

    /**
     * Read text content from file
     */
    private async readFileContent(file: File): Promise<string> {
        const fileType = this.getFileType(file.name);

        if (fileType === 'pdf') {
            // For PDF, we'd need a PDF parsing library
            // For now, we'll throw an error and suggest txt/md
            throw new Error('PDF parsing not yet implemented. Please upload TXT or MD files.');
        }

        // Text-based files
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Split text into overlapping chunks
     */
    chunkText(text: string): string[] {
        const chunks: string[] = [];
        const chunkSizeChars = CHUNK_SIZE * CHARS_PER_TOKEN;
        const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;

        // Clean and normalize text
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Split by paragraphs first, then combine into chunks
        const paragraphs = cleanText.split(/\n\n+/);
        let currentChunk = '';

        for (const paragraph of paragraphs) {
            // If adding this paragraph would exceed chunk size, save current and start new
            if (currentChunk.length + paragraph.length > chunkSizeChars && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                // Keep overlap from end of previous chunk
                currentChunk = currentChunk.slice(-overlapChars) + '\n\n' + paragraph;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            }
        }

        // Don't forget the last chunk
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Single logging boundary for every embedding call (spec §1: every provider
     * call crosses one logged boundary and writes exactly one model_call_log row,
     * successes and failures alike). Logging is fire-and-forget and can never
     * break the call itself.
     */
    private async embedRequest(input: string[] | string): Promise<Response> {
        const started = Date.now();
        const prompt = Array.isArray(input) ? `embedding batch (${input.length} chunks)` : input;
        try {
            const response = await fetch('/api/chutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetUrl: EMBEDDING_URL,
                    body: {
                        model: EMBEDDING_MODEL,
                        input,
                    },
                    userKey: this.chutesApiKey || undefined,
                }),
            });
            void logModelCall({
                mode: 'embedding',
                model: EMBEDDING_MODEL,
                prompt,
                latency_ms: Date.now() - started,
                status: response.ok ? 'ok' : 'error',
                error: response.ok ? null : `HTTP ${response.status}`,
            });
            return response;
        } catch (err) {
            void logModelCall({
                mode: 'embedding',
                model: EMBEDDING_MODEL,
                prompt,
                latency_ms: Date.now() - started,
                status: 'error',
                error: err instanceof Error ? err.message : 'request failed',
            });
            throw err;
        }
    }

    /**
     * Generate embeddings for chunks using Chutes API
     */
    private async embedChunks(
        chunks: string[],
        onProgress?: (progress: number) => void
    ): Promise<number[][]> {
        const embeddings: number[][] = [];
        const batchSize = 10; // Process in batches to avoid rate limits

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            const response = await this.embedRequest(batch);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
            }

            const data: unknown = await response.json();
            const validated = validateEmbeddingResponse(data);
            if (!validated.ok) {
                throw new Error(`Embedding API returned malformed output: ${formatErrors(validated)}`);
            }
            for (const embedding of validated.value) {
                embeddings.push(embedding);
            }

            onProgress?.((i + batch.length) / chunks.length);
        }

        return embeddings;
    }

    /**
     * Store chunks with embeddings in database
     */
    private async storeChunks(
        documentId: string,
        userId: string,
        chunks: string[],
        embeddings: number[][],
        accessToken: string
    ): Promise<void> {
        const records = chunks.map((content, index) => ({
            document_id: documentId,
            user_id: userId,
            content,
            embedding: JSON.stringify(embeddings[index]), // pgvector accepts JSON array
            chunk_index: index,
            token_count: Math.ceil(content.length / CHARS_PER_TOKEN),
        }));

        // Insert in batches
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            const response = await fetch(
                `${this.supabaseUrl}/rest/v1/knowledge_chunks`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batch),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to store chunks');
            }
        }
    }

    /**
     * Update document status after ingestion
     */
    private async updateDocumentStatus(
        documentId: string,
        status: 'ready' | 'error',
        accessToken: string,
        chunkCount?: number
    ): Promise<KnowledgeDocument> {
        const updates: Record<string, unknown> = { status };
        if (chunkCount !== undefined) {
            updates.chunk_count = chunkCount;
        }

        const response = await fetch(
            `${this.supabaseUrl}/rest/v1/knowledge_documents?id=eq.${documentId}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify(updates),
            }
        );

        if (!response.ok) {
            throw new Error('Failed to update document status');
        }

        const [doc] = await response.json();
        return doc;
    }

    // ===========================================================================
    // Semantic Search
    // ===========================================================================

    /**
     * Search knowledge base for relevant chunks
     */
    async searchKnowledge(
        query: string,
        userId: string,
        accessToken: string,
        limit: number = 5,
        threshold: number = 0.7
    ): Promise<SearchResult[]> {
        // Lane A cache (spec §3): identical retrieval query within TTL is served
        // from Supabase `query_cache` (observably — hit_count + cache_hit row).
        const cached = await getCachedKnowledge({ userId, query, limit, threshold });
        if (cached) {
            return cached;
        }

        // Generate embedding for query (via the server-side proxy — never a
        // client-built Authorization header)
        const response = await this.embedRequest(query);

        if (!response.ok) {
            throw new Error('Failed to generate query embedding');
        }

        const data: unknown = await response.json();
        const validatedEmbedding = validateEmbeddingResponse(data);
        if (!validatedEmbedding.ok || validatedEmbedding.value.length === 0) {
            throw new Error(`Query embedding failed schema validation: ${validatedEmbedding.ok ? 'empty embedding' : formatErrors(validatedEmbedding)}`);
        }
        const queryEmbedding = validatedEmbedding.value[0];

        // Call RPC function for similarity search
        const searchResponse = await fetch(
            `${this.supabaseUrl}/rest/v1/rpc/search_knowledge`,
            {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query_embedding: JSON.stringify(queryEmbedding),
                    match_user_id: userId,
                    match_count: limit,
                    match_threshold: threshold,
                }),
            }
        );

        if (!searchResponse.ok) {
            throw new Error('Failed to search knowledge base');
        }

        // Fail closed (spec §2): malformed RPC rows are dropped and counted;
        // a malformed envelope degrades to a typed error — never the prompt/UI.
        const rawRows: unknown = await searchResponse.json();
        const validatedRows = validateKnowledgeResults(rawRows);
        if (!validatedRows.ok) {
            throw new Error(`Knowledge search returned malformed output: ${formatErrors(validatedRows)}`);
        }
        if (validatedRows.dropped > 0) {
            console.warn(`Knowledge search: dropped ${validatedRows.dropped} malformed row(s)`);
        }

        // Cache only non-empty successful retrievals.
        if (validatedRows.value.length > 0) {
            await setCachedKnowledge({ userId, query, limit, threshold, results: validatedRows.value });
        }
        return validatedRows.value;
    }

    /**
     * Build RAG context from search results
     */
    buildRAGContext(results: SearchResult[]): string {
        if (results.length === 0) {
            return '';
        }

        const contextParts = results.map((r, i) =>
            `[Document: ${r.filename}, Relevance: ${(r.similarity * 100).toFixed(1)}%]\n${r.content}`
        );

        return `
=== KNOWLEDGE BASE CONTEXT ===
The following excerpts from the user's uploaded documents may be relevant:

${contextParts.join('\n\n---\n\n')}

=== END KNOWLEDGE BASE CONTEXT ===
`.trim();
    }

    // ===========================================================================
    // Helpers
    // ===========================================================================

    private getFileType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const typeMap: Record<string, string> = {
            'pdf': 'pdf',
            'txt': 'txt',
            'md': 'md',
            'markdown': 'md',
            'json': 'json',
            'csv': 'csv',
        };
        return typeMap[ext] || 'txt';
    }
}
