"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, X, CheckCircle, Clock, AlertCircle } from "lucide-react"
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

interface WorkflowStep {
  id: string
  name: string
  status: "pending" | "running" | "completed" | "error"
  message?: string
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

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: "upload", name: "Upload Files", status: "pending" },
    { id: "docai", name: "Run Document Processing", status: "pending" },
    { id: "gemini", name: "Analyze Documents", status: "pending" },
  ])

  const updateStepStatus = (stepId: string, status: WorkflowStep["status"], message?: string) => {
    setWorkflowSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status, message } : step)))
  }

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
    setShowResults(false)

    try {
      const currentQuoteId = ensureQuoteId()
      setQuoteId(currentQuoteId)

      updateStepStatus("upload", "running", "Creating signed upload URLs...")
      setOverlayMessage("Step 1: Uploading files...")
      setOverlayProgress(10)

      const uploadPromises = uploadedFiles.map(async (uploadFile) => {
        try {
          console.log(`[v0] Requesting signed URL for: ${uploadFile.file.name}`)

          // Get signed upload URL
          const signedUrlResponse = await fetch("/api/storage/signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quote_id: currentQuoteId,
              filename: uploadFile.file.name,
              contentType: uploadFile.file.type,
            }),
          })

          if (!signedUrlResponse.ok) {
            const errorText = await signedUrlResponse.text()
            console.error(`[v0] Signed URL request failed for ${uploadFile.file.name}:`, errorText)
            throw new Error(`Failed to get signed URL for ${uploadFile.file.name}: ${errorText}`)
          }

          const { uploadUrl } = await signedUrlResponse.json()
          console.log(`[v0] Got signed URL for: ${uploadFile.file.name}`)

          // Upload file using signed URL
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: uploadFile.file,
            headers: {
              "Content-Type": uploadFile.file.type,
            },
          })

          if (!uploadResponse.ok) {
            console.error(
              `[v0] File upload failed for ${uploadFile.file.name}:`,
              uploadResponse.status,
              uploadResponse.statusText,
            )
            throw new Error(
              `Failed to upload ${uploadFile.file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`,
            )
          }

          console.log(`[v0] Successfully uploaded: ${uploadFile.file.name}`)
          return uploadFile.file.name
        } catch (error) {
          console.error(`[v0] Upload error for ${uploadFile.file.name}:`, error)
          throw error
        }
      })

      const uploadedFileNames = await Promise.all(uploadPromises)
      updateStepStatus("upload", "completed", `Uploaded ${uploadedFileNames.length} files`)
      setOverlayProgress(30)

      updateStepStatus("docai", "running", "Starting document processing...")
      setOverlayMessage("Step 2: Processing documents...")
      setOverlayProgress(40)

      // Create files array with signed URLs for processing
      const filesForProcessing = await Promise.all(
        uploadedFileNames.map(async (fileName) => {
          // Get signed URL for reading the uploaded file
          const signedUrlResponse = await fetch("/api/storage/signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quote_id: currentQuoteId,
              filename: fileName,
              operation: "read",
            }),
          })

          if (!signedUrlResponse.ok) {
            throw new Error(`Failed to get read URL for ${fileName}`)
          }

          const { signedUrl } = await signedUrlResponse.json()
          return {
            fileName,
            signedUrl,
          }
        }),
      )

      const processingResponse = await fetch("/api/process-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: currentQuoteId,
          files: filesForProcessing,
        }),
      })

      if (!processingResponse.ok) {
        const errorText = await processingResponse.text()
        console.error("[v0] Document processing failed:", errorText)
        throw new Error("Failed to process documents")
      }

      const processingResult = await processingResponse.json()
      const totalPages = processingResult.results?.reduce((sum: number, result: any) => sum + result.page_count, 0) || 0
      const totalWords =
        processingResult.results?.reduce((sum: number, result: any) => sum + result.total_word_count, 0) || 0

      updateStepStatus("docai", "completed", `Processed ${totalPages} pages, ${totalWords} words`)
      setOverlayProgress(60)

      updateStepStatus("gemini", "running", "Starting hybrid analysis...")
      setOverlayMessage("Step 3: Analyzing documents...")
      setOverlayProgress(70)

      const analysisPromises = filesForProcessing.map(async (file) => {
        const geminiResponse = await fetch("/api/gemini/analyze-hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quote_id: currentQuoteId,
            objectPath: file.fileName,
            maxPages: 50,
          }),
        })

        if (!geminiResponse.ok) {
          throw new Error(`Failed to analyze ${file.fileName}`)
        }

        return await geminiResponse.json()
      })

      const analysisResults = await Promise.all(analysisPromises)
      updateStepStatus("gemini", "completed", "Hybrid analysis completed")
      setOverlayProgress(90)

      // Finalize
      setOverlayMessage("Analysis complete!")
      setOverlayProgress(100)
      setShowResults(true)
      setTimeout(() => setIsProcessing(false), 1000)

      console.log("[v0] Actions Taken: Completed three-step hybrid pipeline workflow")
    } catch (error) {
      console.error("[v0] Workflow error:", error)

      // Update failed step status
      const currentStep = workflowSteps.find((step) => step.status === "running")
      if (currentStep) {
        updateStepStatus(currentStep.id, "error", error instanceof Error ? error.message : "Unknown error")
      }

      alert(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
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
    maxSize: 50 * 1024 * 1024, // Increased to 50MB since server-side can handle larger files
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

        {(isProcessing || showResults) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Processing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {step.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {step.status === "running" && <Clock className="h-5 w-5 text-blue-500 animate-spin" />}
                      {step.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                      {step.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{step.name}</span>
                        <Badge
                          variant={
                            step.status === "completed"
                              ? "default"
                              : step.status === "running"
                                ? "secondary"
                                : step.status === "error"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {step.status}
                        </Badge>
                      </div>
                      {step.message && <p className="text-sm text-muted-foreground mt-1">{step.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="text-xs text-muted mt-2">Maximum file size: 50MB per file</p>
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
                {isProcessing ? "Processing..." : "Get Instant Quote"}
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
