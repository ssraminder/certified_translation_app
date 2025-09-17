"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ensureQuoteId } from "@/lib/utils"
import { AnalysisOverlay } from "./analysis-overlay"
import { QuoteResults } from "./quote-results"

interface FormData {
  name: string
  email: string
  phone: string
  intendedUse: string
  sourceLanguage: string
  targetLanguage: string
}

interface UploadedFile {
  file: File
  id: string
}

export function QuoteRequestForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    intendedUse: "",
    sourceLanguage: "",
    targetLanguage: "",
  })

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [overlayMessage, setOverlayMessage] = useState("")
  const [overlayProgress, setOverlayProgress] = useState(0)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Dedupe by name:size
      const existingFiles = new Set(uploadedFiles.map((f) => `${f.file.name}:${f.file.size}`))
      const newFiles = acceptedFiles
        .filter((file) => !existingFiles.has(`${file.name}:${file.size}`))
        .map((file) => ({
          file,
          id: crypto.randomUUID(),
        }))

      setUploadedFiles((prev) => [...prev, ...newFiles])
    },
    [uploadedFiles],
  )

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {}

    if (!formData.name.trim()) errors.name = "Name is required"
    if (!formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    if (!formData.intendedUse) errors.intendedUse = "Please select intended use"
    if (!formData.sourceLanguage) errors.sourceLanguage = "Please select source language"
    if (!formData.targetLanguage) errors.targetLanguage = "Please select target language"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || uploadedFiles.length === 0) {
      if (uploadedFiles.length === 0) {
        alert("Please upload at least one file")
      }
      return
    }

    setIsProcessing(true)
    setOverlayMessage("Submitting...")
    setOverlayProgress(10)

    try {
      const currentQuoteId = ensureQuoteId()
      setQuoteId(currentQuoteId)

      const supabase = createClient()

      // Step 1: Upload files to Supabase Storage
      setOverlayMessage("Uploading files...")
      setOverlayProgress(20)

      const fileUploadPromises = uploadedFiles.map(async (uploadFile) => {
        const filePath = `${currentQuoteId}/${uploadFile.file.name}`

        try {
          console.log("[v0] Uploading file:", uploadFile.file.name, "to path:", filePath)

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("orders")
            .upload(filePath, uploadFile.file, {
              upsert: true, // Allow overwriting if file exists
            })

          if (uploadError) {
            console.error("[v0] Storage upload error:", uploadError)
            throw new Error(`Failed to upload ${uploadFile.file.name}: ${uploadError.message}`)
          }

          console.log("[v0] Upload successful:", uploadData)

          // Get public URL
          const { data: urlData } = supabase.storage.from("orders").getPublicUrl(filePath)
          console.log("[v0] Public URL generated:", urlData.publicUrl)

          // Insert database record
          const { error: dbError } = await supabase.from("quote_files").insert({
            quote_id: currentQuoteId,
            file_name: uploadFile.file.name,
            storage_path: filePath,
            public_url: urlData.publicUrl,
            ocr_status: "pending",
            gem_status: "pending",
          })

          if (dbError) {
            console.error("[v0] Database insert error:", dbError)
            throw new Error(`Failed to save ${uploadFile.file.name} to database: ${dbError.message}`)
          }

          return {
            fileName: uploadFile.file.name,
            signedUrl: urlData.publicUrl,
          }
        } catch (error) {
          console.error("[v0] File upload process error:", error)
          throw error
        }
      })

      const uploadResults = await Promise.all(fileUploadPromises)
      setOverlayProgress(30)

      // Step 2: Run OCR
      setOverlayMessage("Running OCR...")
      setOverlayProgress(40)

      const ocrResponse = await fetch("/api/run-vision-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: currentQuoteId,
          files: uploadResults,
        }),
      })

      const ocrResult = await ocrResponse.json()
      if (ocrResult.status === "error") {
        throw new Error(ocrResult.message)
      }

      setOverlayProgress(60)

      // Step 3: Run Gemini Analysis
      setOverlayMessage("Analyzing with Gemini...")
      setOverlayProgress(70)

      const geminiResponse = await fetch("/api/run-gemini-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: currentQuoteId,
          fileNames: uploadedFiles.map((f) => f.file.name),
        }),
      })

      const geminiResult = await geminiResponse.json()
      if (geminiResult.status === "error") {
        throw new Error(geminiResult.message)
      }

      setOverlayProgress(90)

      // Step 4: Start polling for results
      setOverlayMessage("Finalizing analysis...")

      let pollCount = 0
      const maxPolls = 20
      const pollInterval = 1500

      const pollResults = async (): Promise<void> => {
        if (pollCount >= maxPolls) {
          setOverlayMessage("Analysis complete")
          setOverlayProgress(100)
          setShowResults(true)
          setTimeout(() => setIsProcessing(false), 1000)
          return
        }

        const response = await fetch(`/api/fetch-quote-files?quote_id=${currentQuoteId}`)
        const data = await response.json()

        if (data.status === "ok" && data.rows) {
          const allTerminal = data.rows.every((row: any) =>
            ["success", "error", "done", "completed"].includes(row.gem_status?.toLowerCase()),
          )

          if (allTerminal) {
            setOverlayMessage("Analysis complete")
            setOverlayProgress(100)
            setShowResults(true)
            setTimeout(() => setIsProcessing(false), 1000)
            return
          }
        }

        pollCount++
        setTimeout(pollResults, pollInterval)
      }

      await pollResults()
    } catch (error) {
      console.error("[v0] Quote submission error:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
      setOverlayMessage("Error occurred during processing")
      setTimeout(() => setIsProcessing(false), 2000)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  })

  return (
    <>
      <AnalysisOverlay isOpen={isProcessing} message={overlayMessage} progress={overlayProgress} />

      <div className="space-y-8">
        {/* Header with Logo placeholder */}
        <div className="text-center">
          <div className="w-16 h-16 bg-secondary rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-secondary-foreground font-bold text-xl">CT</span>
          </div>
        </div>

        {/* Quote Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-foreground">Request Your Quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className={formErrors.email ? "border-destructive" : ""}
                />
                {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            {/* Translation Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="intendedUse">Intended Use *</Label>
                <Select
                  value={formData.intendedUse}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, intendedUse: value }))}
                >
                  <SelectTrigger className={`${formErrors.intendedUse ? "border-destructive" : ""} text-foreground`}>
                    <SelectValue placeholder="Select use" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immigration">Immigration</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.intendedUse && <p className="text-sm text-destructive">{formErrors.intendedUse}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceLanguage">Source Language *</Label>
                <Select
                  value={formData.sourceLanguage}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, sourceLanguage: value }))}
                >
                  <SelectTrigger className={`${formErrors.sourceLanguage ? "border-destructive" : ""} text-foreground`}>
                    <SelectValue placeholder="From" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="hr">Croatian</SelectItem>
                    <SelectItem value="pa">Punjabi</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.sourceLanguage && <p className="text-sm text-destructive">{formErrors.sourceLanguage}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetLanguage">Target Language *</Label>
                <Select
                  value={formData.targetLanguage}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, targetLanguage: value }))}
                >
                  <SelectTrigger className={`${formErrors.targetLanguage ? "border-destructive" : ""} text-foreground`}>
                    <SelectValue placeholder="To" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="hr">Croatian</SelectItem>
                    <SelectItem value="pa">Punjabi</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.targetLanguage && <p className="text-sm text-destructive">{formErrors.targetLanguage}</p>}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label>Upload Documents *</Label>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? "border-secondary bg-secondary/10" : "border-border bg-card hover:bg-card/80"}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted" />
                <h3 className="text-lg font-medium text-card-foreground mb-2">
                  {isDragActive ? "Drop files here" : "Drag and drop your files here"}
                </h3>
                <p className="text-muted mb-4">or click to select files from your computer</p>
                <div className="flex flex-wrap justify-center gap-2 text-sm text-muted">
                  <Badge variant="secondary">PDF</Badge>
                  <Badge variant="secondary">DOC</Badge>
                  <Badge variant="secondary">DOCX</Badge>
                  <Badge variant="secondary">XLSX</Badge>
                  <Badge variant="secondary">Images</Badge>
                </div>
                <p className="text-xs text-muted mt-2">Maximum file size: 10MB per file</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Selected Files ({uploadedFiles.length})</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((uploadFile) => (
                      <div key={uploadFile.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                        <FileText className="h-5 w-5 text-secondary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-card-foreground truncate">{uploadFile.file.name}</p>
                          <p className="text-sm text-muted">{(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={handleSubmit} disabled={isProcessing} size="lg" className="px-8">
                Get Instant Quote
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {showResults && quoteId && <QuoteResults quoteId={quoteId} />}
      </div>
    </>
  )
}
