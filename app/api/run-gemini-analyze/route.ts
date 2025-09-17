import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"

interface GeminiRequestBody {
  quote_id: string
  fileNames: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: GeminiRequestBody = await request.json()
    const { quote_id, fileNames } = body

    if (!quote_id || !fileNames || !Array.isArray(fileNames)) {
      return NextResponse.json({
        status: "error",
        message: "Invalid request body. Expected quote_id and fileNames array.",
      })
    }

    // Initialize Gemini client
    const apiKey = process.env.GOOGLE_API_KEY
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"

    if (!apiKey) {
      return NextResponse.json({
        status: "error",
        message: "Google API key not configured",
      })
    }

    console.log("[gemini] model:", modelName)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: modelName })

    const supabase = await createClient()

    // Process each file
    for (const fileName of fileNames) {
      try {
        console.log(`[Gemini] Analyzing file: ${fileName}`)

        // Get file data from Supabase storage
        const { data: fileData } = await supabase
          .from("quote_files")
          .select("storage_path, public_url")
          .eq("quote_id", quote_id)
          .eq("file_name", fileName)
          .single()

        if (!fileData?.public_url) {
          throw new Error(`File not found in storage: ${fileName}`)
        }

        // Fetch file content
        const response = await fetch(fileData.public_url)
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()
        const base64Content = Buffer.from(buffer).toString("base64")
        const mimeType = response.headers.get("content-type") || "application/octet-stream"

        // Call Gemini API
        const fileSizeLimit = 4 * 1024 * 1024 // 4MB limit to match Vercel function constraints
        if (buffer.byteLength > fileSizeLimit) {
          throw new Error(
            `File too large for Gemini analysis: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB (limit: 4MB due to Vercel function constraints)`,
          )
        }

        const prompt = `Analyze this document and provide a JSON response with the following structure:
{
  "languages_all": ["language1", "language2"],
  "pages": {
    "1": {
      "complexity": "Low|Medium|High",
      "document_type": "Contract|Legal Document|Certificate|Invoice|Other",
      "names": ["name1", "name2"],
      "languages": ["language1"],
      "confidence": 0.95
    }
  }
}

Please analyze the document content, identify all languages present, extract any person names, determine document type and complexity for each page, and provide confidence scores.`

        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Content,
              mimeType: mimeType,
            },
          },
          prompt,
        ])

        const responseText = result.response.text()
        console.log(`[Gemini] Raw response for ${fileName}:`, responseText)

        let analysisData
        try {
          // Check if response looks like an error message
          if (
            responseText.startsWith("Request Entity Too Large") ||
            responseText.startsWith("Request En") ||
            responseText.includes("FUNCTION_PAYLOAD_TOO_LARGE")
          ) {
            throw new Error(`Gemini API error: ${responseText.split("\n")[0]}`)
          }

          // Try to extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            analysisData = JSON.parse(jsonMatch[0])
          } else {
            // If no JSON found, create a structured response from the text
            console.log(`[Gemini] No JSON found, creating structured response from text for ${fileName}`)
            analysisData = {
              languages_all: ["unknown"],
              pages: {
                "1": {
                  complexity: "Medium",
                  document_type: "Document",
                  names: [],
                  languages: ["unknown"],
                  confidence: 0.8,
                },
              },
              raw_analysis: responseText, // Store the full text analysis
            }
          }
        } catch (parseError) {
          console.error(`[Gemini] Failed to parse response for ${fileName}:`, responseText)
          // Create a fallback response structure
          analysisData = {
            languages_all: ["unknown"],
            pages: {
              "1": {
                complexity: "Medium",
                document_type: "Document",
                names: [],
                languages: ["unknown"],
                confidence: 0.5,
              },
            },
            raw_analysis: responseText,
            parse_error: parseError instanceof Error ? parseError.message : "Unknown parsing error",
          }
        }

        // Extract data for database storage
        const gem_languages_all = analysisData.languages_all || []
        const pages = analysisData.pages || {}

        const gem_page_complexity: Record<string, string> = {}
        const gem_page_doc_types: Record<string, string> = {}
        const gem_page_names: Record<string, string[]> = {}
        const gem_page_languages: Record<string, string[]> = {}
        const gem_page_confidence: Record<string, number> = {}

        // Process each page
        Object.entries(pages).forEach(([pageNum, pageData]: [string, any]) => {
          gem_page_complexity[pageNum] = pageData.complexity || "Medium"
          gem_page_doc_types[pageNum] = pageData.document_type || "Unknown Document"
          gem_page_names[pageNum] = pageData.names || []
          gem_page_languages[pageNum] = pageData.languages || []
          gem_page_confidence[pageNum] = pageData.confidence || 0
        })

        // Update database
        await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: fileName,
            gem_status: "success",
            gem_message: null,
            gem_languages_all,
            gem_page_complexity,
            gem_page_doc_types,
            gem_page_names,
            gem_page_languages,
            gem_page_confidence,
          },
          {
            onConflict: "quote_id,file_name",
          },
        )

        console.log(`[Gemini] Successfully analyzed ${fileName}`)
      } catch (fileError) {
        console.error(`[Gemini] Error analyzing file ${fileName}:`, fileError)

        const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error during Gemini analysis"

        // Update DB with error status
        await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: fileName,
            gem_status: "failed", // Use "failed" instead of "error" to match database constraint
            gem_message: errorMessage,
          },
          {
            onConflict: "quote_id,file_name",
          },
        )
      }
    }

    return NextResponse.json({
      status: "ok",
    })
  } catch (error) {
    console.error("[Gemini] API Error:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred during Gemini analysis",
    })
  }
}
