-- Create the quote_submissions table for tracking overall quote processing status
CREATE TABLE IF NOT EXISTS quote_submissions (
  quote_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'docai_running', 'docai_done', 'gemini_running', 'gemini_done', 'error')),
  last_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access" ON quote_submissions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON quote_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON quote_submissions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON quote_submissions FOR DELETE USING (true);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_quote_submissions_status ON quote_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_updated_at ON quote_submissions(updated_at DESC);
