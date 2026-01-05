-- =============================================================================
-- GT Assistant Knowledge Base Schema
-- Enables RAG (Retrieval Augmented Generation) with pgvector
-- =============================================================================

-- Enable pgvector extension (requires Supabase to have it installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- Table: knowledge_documents
-- Stores metadata about uploaded documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt', 'md', 'json', 'csv')),
  file_size INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- Table: knowledge_chunks
-- Stores text chunks with vector embeddings for semantic search
-- =============================================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-ada-002 compatible
  chunk_index INTEGER NOT NULL,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id 
  ON knowledge_documents(user_id);

-- Fast lookup by document
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id 
  ON knowledge_chunks(document_id);

-- Vector similarity search index (IVFFlat for speed)
-- Note: For production with >100k vectors, consider HNSW index
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding 
  ON knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "Users can manage own documents"
  ON knowledge_documents
  FOR ALL
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can only see their own chunks
CREATE POLICY "Users can manage own chunks"
  ON knowledge_chunks
  FOR ALL
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- =============================================================================
-- RPC Function: search_knowledge
-- Performs semantic similarity search on user's knowledge base
-- =============================================================================
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_user_id TEXT,
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  filename TEXT,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.document_id,
    kd.filename,
    kc.content,
    kc.chunk_index,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.user_id = match_user_id
    AND kd.status = 'ready'
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- Trigger: Update document's updated_at on change
-- =============================================================================
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_timestamp();

-- =============================================================================
-- Grant permissions for service role
-- =============================================================================
GRANT ALL ON knowledge_documents TO service_role;
GRANT ALL ON knowledge_chunks TO service_role;
GRANT EXECUTE ON FUNCTION search_knowledge TO service_role;
