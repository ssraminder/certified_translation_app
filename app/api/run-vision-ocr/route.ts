import { type NextRequest, NextResponse } from "next/server"
import vision from "@google-cloud/vision"
import { createClient } from "@/lib/supabase/server"

interface OCRRequestBody {
  quote_id: string
  files: Array<{ fileName: string; signedUrl: string }>
}

interface OCRResult {
  file_name: string
  page_count: number
  total_word_count: number
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

    // Initialize Google Vision client
    const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const client = json
      ? new vision.ImageAnnotatorClient({ credentials: JSON.parse(json) })
      : new vision.ImageAnnotatorClient()

    const supabase = await createClient()
    const results: OCRResult[] = []

    // Process each file
    for (const file of files) {
      try {
        console.log(`[OCR] Processing file: ${file.fileName}`)

        // Fetch file from signed URL
        const response = await fetch(file.signedUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()
        const base64Content = Buffer.from(buffer).toString("base64")

        // Call Google Vision API for document text detection
        const [result] = await client.documentTextDetection({
          image: { content: base64Content },
        })

        const fullTextAnnotation = result.fullTextAnnotation
        if (!fullTextAnnotation) {
          // Update DB with no text found
          await supabase.from("quote_files").upsert(
            {
              quote_id,
              file_name: file.fileName,
              ocr_status: "success",
              ocr_message: "No text detected in document",
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
          })
          continue
        }

        // Extract words per page
        const pages = fullTextAnnotation.pages || []
        const words_per_page: number[] = []
        let total_word_count = 0

        pages.forEach((page, pageIndex) => {
          const blocks = page.blocks || []
          let pageWordCount = 0

          blocks.forEach((block) => {
            const paragraphs = block.paragraphs || []
            paragraphs.forEach((paragraph) => {
              const words = paragraph.words || []
              pageWordCount += words.length
            })
          })

          words_per_page.push(pageWordCount)
          total_word_count += pageWordCount
        })

        // Detect language (use the first detected language or fallback)
        const detectedLanguages = fullTextAnnotation.pages?.[0]?.property?.detectedLanguages || []
        const detected_language =
          detectedLanguages.length > 0 ? detectedLanguages[0].languageCode || "unknown" : "unknown"

        // Update database
        await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: file.fileName,
            ocr_status: "success",
            ocr_message: null,
            words_per_page,
            total_word_count,
            detected_language,
          },
          {
            onConflict: "quote_id,file_name",
          },
        )

        results.push({
          file_name: file.fileName,
          page_count: pages.length,
          total_word_count,
        })

        console.log(
          `[OCR] Successfully processed ${file.fileName}: ${total_word_count} words across ${pages.length} pages`,
        )
      } catch (fileError) {
        console.error(`[OCR] Error processing file ${file.fileName}:`, fileError)

        // Update DB with error status
        await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: file.fileName,
            ocr_status: "error",
            ocr_message: fileError instanceof Error ? fileError.message : "Unknown error during OCR processing",
            words_per_page: [],
            total_word_count: 0,
            detected_language: "unknown",
          },
          {
            onConflict: "quote_id,file_name",
          },
        )

        // Still add to results with zero counts
        results.push({
          file_name: file.fileName,
          page_count: 0,
          total_word_count: 0,
        })
      }
    }

    return NextResponse.json({
      status: "ok",
      results,
    })
  } catch (error) {
    console.error("[OCR] API Error:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred during OCR processing",
    })
  }
}
