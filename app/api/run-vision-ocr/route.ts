import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface OCRRequestBody {
  quote_id: string
  files: Array<{ fileName: string; signedUrl: string }>
}

interface OCRResult {
  file_name: string
  page_count: number
  total_word_count: number
  words_per_page: number[]
}

async function importPKCS8(pem: string, alg: string) {
  const { importPKCS8 } = await import("jose")
  return importPKCS8(pem, alg)
}

async function processWithDocumentAI(fileBuffer: ArrayBuffer, fileName: string, mimeType: string) {
  console.log(`[v0] Processing ${fileName} with Document AI`)

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (!projectId || !processorId || !credentialsJson) {
    throw new Error("Missing Document AI configuration: PROJECT_ID, PROCESSOR_ID, or CREDENTIALS_JSON")
  }

  const fileSizeInMB = fileBuffer.byteLength / (1024 * 1024)
  if (fileSizeInMB > 4) {
    throw new Error(
      `File too large for processing: ${fileSizeInMB.toFixed(1)}MB exceeds 4MB limit (Vercel function constraint)`,
    )
  }

  // Parse service account credentials
  const credentials = JSON.parse(credentialsJson)

  // Create JWT token for authentication
  const { SignJWT } = await import("jose")
  const privateKey = await importPKCS8(credentials.private_key, "RS256")

  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT({
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey)

  // Get access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error(`[v0] Token request failed:`, tokenResponse.status, errorText)
    throw new Error(`Token request failed: ${errorText}`)
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token

  // Process document with Document AI
  const documentAIUrl = `https://documentai.googleapis.com/v1/projects/${projectId}/locations/us/processors/${processorId}:process`

  const base64Content = Buffer.from(fileBuffer).toString("base64")

  const documentResponse = await fetch(documentAIUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rawDocument: {
        content: base64Content,
        mimeType: mimeType,
      },
    }),
  })

  if (!documentResponse.ok) {
    const errorText = await documentResponse.text()
    console.error(`[v0] Document AI error for ${fileName}:`, documentResponse.status, errorText)
    throw new Error(`Document AI error: ${documentResponse.status} ${errorText}`)
  }

  const responseText = await documentResponse.text()
  let documentResult
  try {
    if (
      responseText.startsWith("Request Entity Too Large") ||
      responseText.includes("FUNCTION_PAYLOAD_TOO_LARGE") ||
      responseText.includes("Request En")
    ) {
      throw new Error(`Document AI payload error: File too large for processing (${fileSizeInMB.toFixed(1)}MB)`)
    }

    documentResult = JSON.parse(responseText)
  } catch (parseError) {
    console.error(`[v0] Failed to parse Document AI response for ${fileName}:`, responseText.substring(0, 200))
    if (responseText.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
      throw new Error(`File too large for processing: ${fileSizeInMB.toFixed(1)}MB exceeds function limits`)
    }
    throw new Error(`Document AI returned invalid JSON response: ${responseText.substring(0, 100)}...`)
  }

  const document = documentResult.document

  if (!document) {
    throw new Error("No document returned from Document AI")
  }

  const pages = document.pages || []
  const pageCount = pages.length
  const wordsPerPage: number[] = []
  let totalWordCount = 0

  // Process each page to count words
  pages.forEach((page: any, pageIndex: number) => {
    let pageWordCount = 0

    // Count words from tokens (most accurate method)
    if (page.tokens) {
      page.tokens.forEach((token: any) => {
        // Only count tokens that contain actual text (not just spaces/punctuation)
        if (token.layout?.textAnchor?.textSegments) {
          const segments = token.layout.textAnchor.textSegments
          segments.forEach((segment: any) => {
            if (segment.startIndex !== undefined && segment.endIndex !== undefined) {
              const tokenText = document.text.substring(segment.startIndex, segment.endIndex).trim()
              if (tokenText && /\w/.test(tokenText)) {
                // Contains word characters
                pageWordCount++
              }
            }
          })
        }
      })
    } else if (page.paragraphs) {
      // Fallback: count from paragraphs if tokens not available
      page.paragraphs.forEach((paragraph: any) => {
        if (paragraph.layout?.textAnchor?.textSegments) {
          const segments = paragraph.layout.textAnchor.textSegments
          segments.forEach((segment: any) => {
            if (segment.startIndex !== undefined && segment.endIndex !== undefined) {
              const paragraphText = document.text.substring(segment.startIndex, segment.endIndex)
              const words = paragraphText
                .trim()
                .split(/\s+/)
                .filter((word) => word.length > 0 && /\w/.test(word))
              pageWordCount += words.length
            }
          })
        }
      })
    }

    wordsPerPage.push(pageWordCount)
    totalWordCount += pageWordCount
    console.log(`[v0] Page ${pageIndex + 1}: ${pageWordCount} words`)
  })

  // Get detected language
  let detectedLanguage = "unknown"
  if (pages.length > 0 && pages[0].detectedLanguages) {
    detectedLanguage = pages[0].detectedLanguages[0]?.languageCode || "unknown"
  }

  console.log(`[v0] Document AI processed ${fileName}: ${totalWordCount} words across ${pageCount} pages`)
  console.log(`[v0] Per-page word counts: ${wordsPerPage.join(", ")}`)

  return {
    totalWordCount,
    pageCount,
    detectedLanguage,
    wordsPerPage,
    fullText: document.text || "",
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OCRRequestBody = await request.json()
    const { quote_id, files } = body

    if (!quote_id || !files || !Array.isArray(files)) {
      return NextResponse.json({
        status: "error",
        message: "Invalid request body. Expected quote_id and files array.",
      })
    }

    console.log("[v0] OCR API called with quote_id:", quote_id)
    console.log("[v0] Number of files to process:", files.length)

    const supabase = await createClient()
    const results: OCRResult[] = []

    // Process each file
    for (const file of files) {
      try {
        console.log(`[v0] Processing file: ${file.fileName}`)

        const fileExtension = file.fileName.toLowerCase().split(".").pop()
        const isImageFile = ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension || "")
        const isPdfFile = fileExtension === "pdf"

        if (!isImageFile && !isPdfFile) {
          console.log(`[v0] Skipping OCR for ${file.fileName} - unsupported file type (${fileExtension})`)

          await supabase.from("quote_files").upsert(
            {
              quote_id,
              file_name: file.fileName,
              ocr_status: "skipped",
              ocr_message: "OCR skipped - file type not supported",
              words_per_page: [],
              total_word_count: 0,
              detected_language: "unknown",
            },
            {
              onConflict: "quote_id,file_name",
            },
          )

          results.push({
            file_name: file.fileName,
            page_count: 0,
            total_word_count: 0,
            words_per_page: [],
          })
          continue
        }

        // Fetch file from signed URL
        const response = await fetch(file.signedUrl)
        if (!response.ok) {
          console.error(`[v0] Failed to fetch file ${file.fileName}:`, response.status, response.statusText)
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()

        const mimeType = isPdfFile ? "application/pdf" : `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`
        const documentResult = await processWithDocumentAI(buffer, file.fileName, mimeType)

        const totalWordCount = documentResult.totalWordCount
        const pageCount = documentResult.pageCount
        const detectedLanguage = documentResult.detectedLanguage
        const wordsPerPage = documentResult.wordsPerPage

        const { error: dbError } = await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: file.fileName,
            ocr_status: "completed",
            ocr_message: null,
            words_per_page: wordsPerPage,
            total_word_count: totalWordCount,
            detected_language: detectedLanguage,
          },
          {
            onConflict: "quote_id,file_name",
          },
        )

        if (dbError) {
          console.error(`[v0] Database error for ${file.fileName}:`, dbError)
          throw new Error(`Database error: ${dbError.message}`)
        }

        results.push({
          file_name: file.fileName,
          page_count: pageCount,
          total_word_count: totalWordCount,
          words_per_page: wordsPerPage,
        })

        console.log(`[v0] Successfully processed ${file.fileName}: ${totalWordCount} words across ${pageCount} pages`)
      } catch (fileError) {
        console.error(`[v0] Error processing file ${file.fileName}:`, fileError)

        await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: file.fileName,
            ocr_status: "failed",
            ocr_message: fileError instanceof Error ? fileError.message : "Unknown error during OCR processing",
            words_per_page: [],
            total_word_count: 0,
            detected_language: "unknown",
          },
          {
            onConflict: "quote_id,file_name",
          },
        )

        results.push({
          file_name: file.fileName,
          page_count: 0,
          total_word_count: 0,
          words_per_page: [],
        })
      }
    }

    console.log("[v0] OCR processing complete. Results:", results)

    return NextResponse.json({
      status: "success",
      results,
      message: `Successfully processed ${results.length} files`,
    })
  } catch (error) {
    console.error("[v0] OCR API Error:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred during OCR processing",
    })
  }
}
