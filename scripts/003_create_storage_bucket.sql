-- Create storage bucket for quote files
INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', true);

-- Set up RLS policies for the bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'orders');

CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'orders');

CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'orders');

CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'orders');
