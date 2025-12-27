-- =====================================================
-- GT Assistant - Storage Bucket Policies
-- =====================================================
-- Purpose: Configure storage bucket policies for Clerk auth
-- Key Issue: Supabase storage RLS uses auth.uid() which doesn't work with Clerk
-- Solution: Create permissive policies for public access or disable RLS
-- =====================================================

-- =====================================================
-- STEP 1: Create storage buckets if they don't exist
-- =====================================================
-- Note: Buckets should be created via Supabase Dashboard first:
-- 1. Go to Storage in the Supabase Dashboard
-- 2. Create bucket: "media-assets" (set to public: true)
-- 3. Create bucket: "chat-audio" (set to public: true)

-- =====================================================
-- STEP 2: Create permissive policies for media-assets bucket
-- =====================================================

-- Allow anyone to read media files (public access for viewing)
CREATE POLICY "Allow public read access on media-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-assets');

-- Allow anyone to upload media files (since we use Clerk auth, not Supabase auth)
CREATE POLICY "Allow public upload to media-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media-assets');

-- Allow anyone to update media files
CREATE POLICY "Allow public update on media-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media-assets');

-- Allow anyone to delete media files
CREATE POLICY "Allow public delete on media-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'media-assets');

-- =====================================================
-- STEP 3: Create permissive policies for chat-audio bucket
-- =====================================================

-- Allow anyone to read audio files
CREATE POLICY "Allow public read access on chat-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-audio');

-- Allow anyone to upload audio files
CREATE POLICY "Allow public upload to chat-audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-audio');

-- Allow anyone to update audio files
CREATE POLICY "Allow public update on chat-audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-audio');

-- Allow anyone to delete audio files
CREATE POLICY "Allow public delete on chat-audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-audio');

-- =====================================================
-- ALTERNATIVE: Disable RLS on storage.objects entirely
-- =====================================================
-- If the above policies don't work, you can try disabling RLS:
-- WARNING: This makes all storage public - use with caution
--
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
--
-- =====================================================

-- =====================================================
-- VERIFICATION: Check if buckets exist and are public
-- =====================================================
-- Run this to verify your buckets are set up correctly:
--
-- SELECT id, name, public FROM storage.buckets;
--
-- Expected output:
-- - media-assets should have public = true
-- - chat-audio should have public = true
-- =====================================================
