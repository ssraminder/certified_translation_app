-- Update the quote_files table to match the exact specification
ALTER TABLE quote_files 
ADD COLUMN IF NOT EXISTS quote_id TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS public_url TEXT,
ADD COLUMN IF NOT EXISTS ocr_status TEXT,
ADD COLUMN IF NOT EXISTS ocr_message TEXT,
ADD COLUMN IF NOT EXISTS words_per_page INTEGER[],
ADD COLUMN IF NOT EXISTS total_word_count INTEGER,
ADD COLUMN IF NOT EXISTS detected_language TEXT,
ADD COLUMN IF NOT EXISTS gem_status TEXT,
ADD COLUMN IF NOT EXISTS gem_message TEXT,
ADD COLUMN IF NOT EXISTS gem_languages_all TEXT[],
ADD COLUMN IF NOT EXISTS gem_page_complexity JSONB,
ADD COLUMN IF NOT EXISTS gem_page_doc_types JSONB,
ADD COLUMN IF NOT EXISTS gem_page_names JSONB,
ADD COLUMN IF NOT EXISTS gem_page_languages JSONB,
ADD COLUMN IF NOT EXISTS gem_page_confidence JSONB;

-- Drop old columns that don't match the spec
ALTER TABLE quote_files 
DROP COLUMN IF EXISTS filename,
DROP COLUMN IF EXISTS file_size,
DROP COLUMN IF EXISTS file_type,
DROP COLUMN IF EXISTS upload_timestamp,
DROP COLUMN IF EXISTS analysis_status,
DROP COLUMN IF EXISTS analysis_result,
DROP COLUMN IF EXISTS analysis_error,
DROP COLUMN IF EXISTS ocr_text,
DROP COLUMN IF EXISTS ocr_error;

-- Create unique constraint for quote_id and file_name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_files_quote_id_file_name ON quote_files(quote_id, file_name);
