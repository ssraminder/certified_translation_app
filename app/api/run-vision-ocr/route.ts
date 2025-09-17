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

    const apiKey = process.env.GOOGLE_API_KEY
    console.log("[v0] GOOGLE_API_KEY exists:", !!apiKey)

    if (!apiKey) {
      return NextResponse.json({
        status: "error",
        message: "Google API key not configured",
      })
    }

    const supabase = await createClient()
    const results: OCRResult[] = []

    // Process each file
    for (const file of files) {
      try {
        console.log(`[v0] Processing file: ${file.fileName}`)
        console.log(`[v0] File signed URL: ${file.signedUrl}`)

        // Fetch file from signed URL
        const response = await fetch(file.signedUrl)
        if (!response.ok) {
          console.error(`[v0] Failed to fetch file ${file.fileName}:`, response.status, response.statusText)
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()
        const base64Content = Buffer.from(buffer).toString("base64")
        console.log(`[v0] File ${file.fileName} converted to base64, size:`, base64Content.length)

        console.log(`[v0] Calling Google Vision REST API for ${file.fileName}`)
        const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Content,
                },
                features: [
                  {
                    type: "DOCUMENT_TEXT_DETECTION",
                  },
                ],
              },
            ],
          }),
        })

        if (!visionResponse.ok) {
          const errorText = await visionResponse.text()
          console.error(`[v0] Vision API error for ${file.fileName}:`, visionResponse.status, errorText)
          throw new Error(`Vision API error: ${visionResponse.status} ${errorText}`)
        }

        const visionResult = await visionResponse.json()
        console.log(`[v0] Vision API response received for ${file.fileName}`)

        const annotation = visionResult.responses?.[0]?.fullTextAnnotation
        if (!annotation) {
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
        const pages = annotation.pages || []
        const words_per_page: number[] = []
        let total_word_count = 0

        pages.forEach((page: any, pageIndex: number) => {
          const blocks = page.blocks || []
          let pageWordCount = 0

          blocks.forEach((block: any) => {
            const paragraphs = block.paragraphs || []
            paragraphs.forEach((paragraph: any) => {
              const words = paragraph.words || []
              pageWordCount += words.length
            })
          })

          words_per_page.push(pageWordCount)
          total_word_count += pageWordCount
        })

        // Detect language (use the first detected language or fallback)
        const detectedLanguages = annotation.pages?.[0]?.property?.detectedLanguages || []
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
          `[v0] Successfully processed ${file.fileName}: ${total_word_count} words across ${pages.length} pages`,
        )
      } catch (fileError) {
        console.error(`[v0] Error processing file ${file.fileName}:`, fileError)

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
    console.error("[v0] OCR API Error:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred during OCR processing",
    })
  }
}
