"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle } from "lucide-react"
import { toLanguageName } from "@/lib/utils"

interface QuoteFile {
  file_name: string
  ocr_status?: string
  ocr_message?: string
  words_per_page?: number[]
  total_word_count?: number
  detected_language?: string
  gem_status?: string
  gem_message?: string
  gem_languages_all?: string[]
  gem_page_complexity?: Record<string, string>
  gem_page_doc_types?: Record<string, string>
  gem_page_names?: Record<string, string[]>
  gem_page_languages?: Record<string, string[]>
  gem_page_confidence?: Record<string, number>
}

interface QuoteResultsProps {
  quoteId: string
}

export function QuoteResults({ quoteId }: QuoteResultsProps) {
  const [files, setFiles] = useState<QuoteFile[]>([])
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [geminiError, setGeminiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/fetch-quote-files?quote_id=${quoteId}`)
        const data = await response.json()

        if (data.status === "ok") {
          setFiles(data.rows || [])

          // Check for errors
          const ocrErrors = data.rows?.filter((row: QuoteFile) => row.ocr_status === "error")
          const geminiErrors = data.rows?.filter((row: QuoteFile) => row.gem_status === "error")

          if (ocrErrors?.length > 0) {
            setOcrError(ocrErrors.map((row: QuoteFile) => row.ocr_message).join(", "))
          }

          if (geminiErrors?.length > 0) {
            setGeminiError(geminiErrors.map((row: QuoteFile) => row.gem_message).join(", "))
          }
        }
      } catch (error) {
        console.error("Error fetching results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [quoteId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted">Loading results...</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare OCR table data
  const ocrRows: Array<{
    filename: string
    pageNo: number
    words: number
    billablePages: number
  }> = []

  files.forEach((file) => {
    if (file.words_per_page && file.words_per_page.length > 0) {
      file.words_per_page.forEach((words, index) => {
        ocrRows.push({
          filename: file.file_name,
          pageNo: index + 1,
          words,
          billablePages: Math.round((words / 250) * 100) / 100,
        })
      })
    }
  })

  // Prepare Gemini table data
  const geminiRows: Array<{
    filename: string
    documentType: string
    pageNo: string
    language: string
    complexity: string
    names: string
    confidence: string
  }> = []

  files.forEach((file) => {
    if (file.gem_page_doc_types) {
      Object.entries(file.gem_page_doc_types).forEach(([pageNum, docType]) => {
        const languages = file.gem_page_languages?.[pageNum] || []
        const names = file.gem_page_names?.[pageNum] || []
        const complexity = file.gem_page_complexity?.[pageNum] || "Unknown"
        const confidence = file.gem_page_confidence?.[pageNum] || 0

        geminiRows.push({
          filename: file.file_name,
          documentType: docType,
          pageNo: pageNum,
          language: languages.map((lang) => toLanguageName(lang)).join(", ") || "Unknown",
          complexity,
          names: names.join(", ") || "None detected",
          confidence: confidence > 1 ? `${Math.round(confidence)}%` : `${Math.round(confidence * 100)}%`,
        })
      })
    }
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Quote Results</h2>
        <p className="text-muted">
          Quote ID: <span className="font-mono font-medium">{quoteId}</span>
        </p>
      </div>

      {/* OCR Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">OCR Results</CardTitle>
        </CardHeader>
        <CardContent>
          {ocrError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{ocrError}</AlertDescription>
            </Alert>
          )}

          {ocrRows.length === 0 ? (
            <p className="text-center text-muted py-8">
              {files.length === 0 ? "No results yet" : "OCR returned no results"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Page No.</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Billable Pages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ocrRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.filename}</TableCell>
                      <TableCell>{row.pageNo}</TableCell>
                      <TableCell>{row.words}</TableCell>
                      <TableCell>{row.billablePages.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gemini Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Gemini Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {geminiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{geminiError}</AlertDescription>
            </Alert>
          )}

          {geminiRows.length === 0 ? (
            <p className="text-center text-muted py-8">Per-page details not available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Page No.</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead>Names</TableHead>
                    <TableHead>Confidence Score (in%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {geminiRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.filename}</TableCell>
                      <TableCell>{row.documentType}</TableCell>
                      <TableCell>{row.pageNo}</TableCell>
                      <TableCell>{row.language}</TableCell>
                      <TableCell>{row.complexity}</TableCell>
                      <TableCell>{row.names}</TableCell>
                      <TableCell>{row.confidence}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
