-- Create the quote_files table for storing translation quote requests
CREATE TABLE IF NOT EXISTS quote_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_text TEXT,
  ocr_error TEXT,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_result JSONB,
  analysis_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quote_files ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required for this app)
CREATE POLICY "Allow public read access" ON quote_files FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON quote_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON quote_files FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON quote_files FOR DELETE USING (true);

-- Create an index on upload_timestamp for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_files_upload_timestamp ON quote_files(upload_timestamp DESC);

-- Create an index on status fields for filtering
CREATE INDEX IF NOT EXISTS idx_quote_files_ocr_status ON quote_files(ocr_status);
CREATE INDEX IF NOT EXISTS idx_quote_files_analysis_status ON quote_files(analysis_status);
