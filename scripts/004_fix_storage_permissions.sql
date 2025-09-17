-- Create storage bucket with proper permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orders',
  'orders',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg', 'image/jpg'];

-- Create RLS policies for the storage bucket
CREATE POLICY "Allow public uploads to orders bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'orders');

CREATE POLICY "Allow public access to orders bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'orders');

CREATE POLICY "Allow public updates to orders bucket" ON storage.objects
FOR UPDATE USING (bucket_id = 'orders');

CREATE POLICY "Allow public deletes from orders bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'orders');
