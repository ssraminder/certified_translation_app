import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

async function processGeminiAnalysisServer(
  fileBlob: Blob,
  fileName: string,
): Promise<{
  wordCount: number
  pageCount: number
  complexity: string
  documentType: string
  personNames: string[]
  languages: string[]
  confidence: number
}> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"

  if (!GOOGLE_API_KEY) {
    throw new Error("Missing Google API key for Gemini")
  }

  const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
  if (fileBlob.size > MAX_FILE_SIZE) {
    console.log(`[v0] File too large for Gemini API (${fileBlob.size} bytes), using fallback analysis`)
    const estimatedWordCount = Math.floor(fileBlob.size / 6) // Rough estimate: 6 bytes per word
    const estimatedPageCount = Math.max(1, Math.floor(estimatedWordCount / 250)) // ~250 words per page

    return {
      wordCount: estimatedWordCount,
      pageCount: estimatedPageCount,
      complexity: "Medium", // Default for large files
      documentType: "Legal Document", // Infer from context
      personNames: [],
      languages: ["es"], // Default based on your use case
      confidence: 0.6, // Lower confidence for estimates
    }
  }

  // Convert blob to base64
  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64Content = Buffer.from(arrayBuffer).toString("base64")

  const prompt = `Analyze this document and provide a JSON response with the following structure:
{
  "wordCount": 1500,
  "pageCount": 3,
  "complexity": "Low|Medium|High",
  "documentType": "Contract|Legal Document|Certificate|Invoice|Academic Document|Personal Document|Business Document|Other",
  "personNames": ["array of person names found"],
  "languages": ["array of detected languages like en, es, fr, pt"],
  "confidence": 0.95
}

Consider:
- Count approximate words and pages in the document
- Complexity: Low (simple forms, certificates), Medium (contracts, academic docs), High (legal documents, technical manuals)
- Extract all person names mentioned in the document
- Detect all languages present (use ISO codes: en, es, fr, pt, etc.)
- Provide confidence score (0-1) for your analysis

Return only valid JSON, no additional text.`

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: fileBlob.type,
              data: base64Content,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
    },
  }

  let response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
  } catch (fetchError) {
    console.error("[v0] Fetch error:", fetchError)
    throw new Error(`Network error calling Gemini API: ${fetchError}`)
  }

  let result
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Gemini API error response:", errorText)

    // Check if it's a file size or quota error
    if (errorText.includes("Request Entity Too Large") || errorText.includes("quota") || response.status === 413) {
      console.log("[v0] File size or quota limit reached, using fallback analysis")
      const estimatedWordCount = Math.floor(fileBlob.size / 6)
      const estimatedPageCount = Math.max(1, Math.floor(estimatedWordCount / 250))

      return {
        wordCount: estimatedWordCount,
        pageCount: estimatedPageCount,
        complexity: "Medium",
        documentType: "Legal Document",
        personNames: [],
        languages: ["es"],
        confidence: 0.6,
      }
    }

    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  try {
    result = await response.json()
  } catch (jsonError) {
    // If JSON parsing fails, we can't read the response again since it's already consumed
    console.error("[v0] Failed to parse Gemini response as JSON:", jsonError)
    throw new Error(`Invalid JSON response from Gemini API`)
  }

  console.log("[v0] Gemini API response structure:", JSON.stringify(result, null, 2))

  if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error("[v0] Unexpected Gemini response structure:", result)
    throw new Error("No response from Gemini API - unexpected response structure")
  }

  const responseText = result.candidates[0].content.parts[0].text
  console.log("[v0] Gemini response text:", responseText)

  try {
    let jsonText = responseText.trim()

    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    // Extract JSON object if embedded in other text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    console.log("[v0] Attempting to parse JSON:", jsonText)
    const analysis = JSON.parse(jsonText)

    return {
      wordCount: typeof analysis.wordCount === "number" ? analysis.wordCount : 1000,
      pageCount: typeof analysis.pageCount === "number" ? analysis.pageCount : 1,
      complexity: analysis.complexity || "Medium",
      documentType: analysis.documentType || "Other",
      personNames: Array.isArray(analysis.personNames) ? analysis.personNames : [],
      languages: Array.isArray(analysis.languages) ? analysis.languages : ["en"],
      confidence: typeof analysis.confidence === "number" ? analysis.confidence : 0.8,
    }
  } catch (parseError) {
    console.error("[v0] Failed to parse Gemini JSON response:", parseError)
    console.error("[v0] Raw response text:", responseText)

    const estimatedWordCount = Math.floor(fileBlob.size / 6) // Rough estimate: 6 bytes per word
    const estimatedPageCount = Math.max(1, Math.floor(estimatedWordCount / 250)) // ~250 words per page

    return {
      wordCount: estimatedWordCount,
      pageCount: estimatedPageCount,
      complexity: responseText.toLowerCase().includes("high")
        ? "High"
        : responseText.toLowerCase().includes("low")
          ? "Low"
          : "Medium",
      documentType: "Other",
      personNames: [],
      languages: ["en"],
      confidence: 0.7,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { quoteId, fileName, fileUrl } = await request.json()

    console.log("[v0] Processing file from storage:", fileName)
    console.log("[v0] File URL:", fileUrl)

    if (!quoteId || !fileName || !fileUrl) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Fetch file from Supabase storage
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file from storage: ${fileResponse.status}`)
    }

    // Clone the response to avoid consuming the stream multiple times
    const fileResponseClone = fileResponse.clone()
    const fileBuffer = await fileResponse.arrayBuffer()
    const fileBlob = new Blob([fileBuffer], { type: "application/pdf" })

    console.log("[v0] File fetched from storage, size:", fileBuffer.byteLength, "bytes")

    const geminiResults = await processGeminiAnalysisServer(fileBlob, fileName)
    console.log("[v0] Gemini analysis complete")

    await updateDatabaseResults(quoteId, fileName, geminiResults)
    console.log("[v0] Database updated successfully")

    return NextResponse.json({
      success: true,
      results: geminiResults,
    })
  } catch (error) {
    console.error("[v0] Error processing file:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed" }, { status: 500 })
  }
}

async function updateDatabaseResults(
  quoteId: string,
  fileName: string,
  geminiResults: Awaited<ReturnType<typeof processGeminiAnalysisServer>>,
) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await supabase
    .from("quote_files")
    .update({
      ocr_status: "completed",
      gem_status: "completed",
      total_word_count: geminiResults.wordCount,
      detected_language: geminiResults.languages[0] || "en",
      words_per_page: Array(geminiResults.pageCount).fill(
        Math.floor(geminiResults.wordCount / geminiResults.pageCount),
      ),
      gem_page_complexity: { complexity: geminiResults.complexity },
      gem_page_doc_types: { documentType: geminiResults.documentType },
      gem_page_names: { personNames: geminiResults.personNames },
      gem_page_languages: { languages: geminiResults.languages },
      gem_languages_all: geminiResults.languages,
      gem_page_confidence: { confidence: geminiResults.confidence },
      updated_at: new Date().toISOString(),
    })
    .eq("quote_id", quoteId)
    .eq("file_name", fileName)

  if (error) {
    throw new Error(`Failed to update database: ${error.message}`)
  }
}
