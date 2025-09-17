-- Update quote_files table to match hybrid pipeline requirements
ALTER TABLE quote_files 
ADD COLUMN IF NOT EXISTS storage_backend TEXT DEFAULT 'SUPABASE',
ADD COLUMN IF NOT EXISTS source_uri TEXT,
ADD COLUMN IF NOT EXISTS gcs_uri TEXT,
ADD COLUMN IF NOT EXISTS docai_output_uri TEXT,
ADD COLUMN IF NOT EXISTS pages INTEGER,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ocr_ok BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gemini_visual_complexity_json JSONB,
ADD COLUMN IF NOT EXISTS gemini_visual_complexity_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS gemini_visual_complexity_class TEXT CHECK (gemini_visual_complexity_class IN ('simple', 'medium', 'complex', 'very_complex')),
ADD COLUMN IF NOT EXISTS gemini_text_summary TEXT,
ADD COLUMN IF NOT EXISTS gemini_text_json JSONB,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_files_quote_id ON quote_files(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_files_storage_backend ON quote_files(storage_backend);
CREATE INDEX IF NOT EXISTS idx_quote_files_ocr_ok ON quote_files(ocr_ok);
