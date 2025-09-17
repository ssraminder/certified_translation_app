// Database types for the quote_files table
export interface QuoteFile {
  id: string
  filename: string
  file_size: number
  file_type: string
  upload_timestamp: string
  ocr_status: "pending" | "processing" | "completed" | "failed"
  ocr_text: string | null
  ocr_error: string | null
  analysis_status: "pending" | "processing" | "completed" | "failed"
  analysis_result: AnalysisResult | null
  analysis_error: string | null
  created_at: string
  updated_at: string
}

// Analysis result structure from Gemini AI
export interface AnalysisResult {
  document_type: string
  source_language: string
  target_language: string
  word_count: number
  page_count: number
  complexity_level: "simple" | "standard" | "complex"
  estimated_price: number
  estimated_delivery_days: number
  special_requirements: string[]
  confidence_score: number
}

// File upload response
export interface FileUploadResponse {
  success: boolean
  file_id?: string
  error?: string
}

// OCR processing response
export interface OCRResponse {
  success: boolean
  text?: string
  error?: string
}

// Analysis response
export interface AnalysisResponse {
  success: boolean
  analysis?: AnalysisResult
  error?: string
}
