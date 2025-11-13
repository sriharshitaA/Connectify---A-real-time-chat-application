-- Create the chat-files bucket if it doesn't exist
-- Note: This needs to be run in Supabase SQL Editor

-- Create bucket (if not exists)
INSERT INTO STORAGE.BUCKETS (
  ID,
  NAME,
  PUBLIC
) VALUES (
  'chat-files',
  'chat-files',
  TRUE
) ON CONFLICT (
  ID
) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE STORAGE.OBJECTS ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON STORAGE.OBJECTS
FOR INSERT WITH CHECK (
  BUCKET_ID = 'chat-files'
  AND AUTH.ROLE() = 'authenticated'
);

-- Policy for authenticated users to view files
CREATE POLICY "Allow authenticated users to view files" ON STORAGE.OBJECTS
FOR SELECT USING (
  BUCKET_ID = 'chat-files'
  AND AUTH.ROLE() = 'authenticated'
);

-- Policy for authenticated users to delete their own files (optional)
CREATE POLICY "Allow authenticated users to delete files" ON STORAGE.OBJECTS
FOR DELETE USING (
  BUCKET_ID = 'chat-files'
  AND AUTH.ROLE() = 'authenticated'
  AND AUTH.UID()::TEXT = (STORAGE.FOLDERNAME(NAME))[1]
);