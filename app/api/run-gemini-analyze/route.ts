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

        // Create prompt for document analysis
        const prompt = `Analyze this document and provide detailed information for each page in JSON format. For each page, identify:

1. Document type (e.g., "Birth Certificate", "Driver's License", "Passport", "Academic Transcript", "Medical Record", "Legal Document", "Business Document", etc.)
2. Complexity level: "Easy", "Medium", or "Hard" based on formatting, technical terms, and layout complexity
3. Languages detected (provide ISO language codes like "en", "es", "fr", "de", "hr", "pa", etc.)
4. Names of people mentioned (extract full names)
5. Confidence score (0-100) for the analysis accuracy

Return ONLY a JSON object with this structure:
{
  "languages_all": ["en", "es"],
  "pages": {
    "1": {
      "document_type": "Birth Certificate",
      "complexity": "Easy",
      "languages": ["en"],
      "names": ["John Smith", "Mary Smith"],
      "confidence": 95
    },
    "2": {
      "document_type": "Academic Transcript", 
      "complexity": "Medium",
      "languages": ["en"],
      "names": ["John Smith"],
      "confidence": 88
    }
  }
}`

        // Call Gemini API
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

        // Parse JSON response
        let analysisData
        try {
          // Clean the response text to extract JSON
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            throw new Error("No JSON found in response")
          }
          analysisData = JSON.parse(jsonMatch[0])
        } catch (parseError) {
          throw new Error(`Failed to parse Gemini response: ${parseError}`)
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

        // Update DB with error status
        await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: fileName,
            gem_status: "error",
            gem_message: fileError instanceof Error ? fileError.message : "Unknown error during Gemini analysis",
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
