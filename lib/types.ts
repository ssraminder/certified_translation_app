// Database types for the quote_files table
export interface QuoteFile {
  id: string
  quote_id: string
  file_name: string
  storage_backend: string
  source_uri: string
  gcs_uri?: string
  docai_output_uri?: string
  storage_path?: string
  public_url?: string
  pages?: number
  word_count?: number
  total_word_count?: number
  ocr_ok: boolean
  ocr_status?: string
  ocr_message?: string
  words_per_page?: number[]
  detected_language?: string
  gem_status?: string
  gem_message?: string
  gem_languages_all?: string[]
  gem_page_complexity?: any
  gem_page_doc_types?: any
  gem_page_names?: any
  gem_page_languages?: any
  gem_page_confidence?: any
  gemini_visual_complexity_json?: any
  gemini_visual_complexity_score?: number
  gemini_visual_complexity_class?: "simple" | "medium" | "complex" | "very_complex"
  gemini_text_summary?: string
  gemini_text_json?: any
  error_message?: string
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

// Database types for the hybrid pipeline
export interface QuoteSubmission {
  quote_id: string
  status: "uploaded" | "docai_running" | "docai_done" | "gemini_running" | "gemini_done" | "error"
  last_message?: string
  created_at: string
  updated_at: string
}

// API request/response types
export interface SignedUrlRequest {
  quote_id: string
  filename: string
  contentType: string
}

export interface SignedUrlResponse {
  uploadUrl: string
  storageBackend: string
  sourceUri: string
}

export interface DocAIBatchRequest {
  quote_id: string
  objectPaths: string[]
}

export interface DocAIBatchResponse {
  operationName: string
  outputPrefixUri: string
}

export interface DocAIStatusResponse {
  done: boolean
  pages?: number
  wordCount?: number
  outputFiles?: string[]
}

export interface GeminiHybridRequest {
  quote_id: string
  objectPath: string
  sampleStrategy?: string
  everyN?: number
  maxPages?: number
  instructions?: string
}

export interface GeminiHybridResponse {
  ok: boolean
  visual?: {
    score: number
    class: string
  }
  text?: {
    summary: string
  }
}
