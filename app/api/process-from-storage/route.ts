import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleAuth } from "google-auth-library"

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

    const fileBuffer = await fileResponse.arrayBuffer()
    const fileBlob = new Blob([fileBuffer], { type: "application/pdf" })

    console.log("[v0] File fetched from storage, size:", fileBuffer.byteLength, "bytes")

    // Process with Document AI
    const ocrResults = await processDocumentAIServer(fileBlob, fileName)
    console.log("[v0] Document AI processing complete")

    // Process with Gemini
    const geminiResults = await processGeminiAnalysisServer(fileBlob, fileName)
    console.log("[v0] Gemini analysis complete")

    // Update database
    await updateDatabaseResults(quoteId, fileName, ocrResults, geminiResults)
    console.log("[v0] Database updated successfully")

    return NextResponse.json({
      success: true,
      results: {
        ocr: ocrResults,
        gemini: geminiResults,
      },
    })
  } catch (error) {
    console.error("[v0] Error processing file:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed" }, { status: 500 })
  }
}

// Document AI server-side processing
async function processDocumentAIServer(
  fileBlob: Blob,
  fileName: string,
): Promise<{
  wordCount: number
  pageCount: number
  language: string
  wordsPerPage: number[]
}> {
  const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID
  const PROCESSOR_ID = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
  const CREDENTIALS_JSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (!PROJECT_ID || !PROCESSOR_ID || !CREDENTIALS_JSON) {
    throw new Error("Missing required Google API configuration")
  }

  // Convert blob to base64
  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64Content = Buffer.from(arrayBuffer).toString("base64")

  const endpoint = `https://documentai.googleapis.com/v1/projects/${PROJECT_ID}/locations/us/processors/${PROCESSOR_ID}:process`

  const requestBody = {
    rawDocument: {
      content: base64Content,
      mimeType: fileBlob.type,
    },
  }

  const accessToken = await getAccessToken()

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Document AI API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  if (!result.document) {
    throw new Error("No document data returned from Document AI")
  }

  // Extract text and calculate word counts
  const pages = result.document.pages || []
  const wordsPerPage: number[] = []
  let totalWords = 0
  let detectedLanguage = "en" // default

  pages.forEach((page: any) => {
    const tokens = page.tokens || []
    const pageWords = tokens.filter(
      (token: any) => token.detectedBreak?.type !== "SPACE" && token.layout?.textAnchor?.textSegments?.[0]?.endIndex,
    ).length

    wordsPerPage.push(pageWords)
    totalWords += pageWords
  })

  // Try to detect language from the first page text
  if (pages.length > 0 && result.document.text) {
    const text = result.document.text.substring(0, 1000).toLowerCase()
    if (text.includes("español") || text.includes("señor") || text.includes("documento")) {
      detectedLanguage = "es"
    } else if (text.includes("français") || text.includes("monsieur") || text.includes("madame")) {
      detectedLanguage = "fr"
    }
  }

  return {
    wordCount: totalWords,
    pageCount: pages.length,
    language: detectedLanguage,
    wordsPerPage,
  }
}

// Gemini AI server-side processing
async function processGeminiAnalysisServer(
  fileBlob: Blob,
  fileName: string,
): Promise<{
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

  // Convert blob to base64
  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64Content = Buffer.from(arrayBuffer).toString("base64")

  const prompt = `Analyze this document and provide a JSON response with the following structure:
{
  "complexity": "Low|Medium|High",
  "documentType": "Contract|Legal Document|Certificate|Invoice|Academic Document|Personal Document|Business Document|Other",
  "personNames": ["array of person names found"],
  "languages": ["array of detected languages"],
  "confidence": 0.95
}

Consider:
- Complexity: Low (simple forms, certificates), Medium (contracts, academic docs), High (legal documents, technical manuals)
- Extract all person names mentioned in the document
- Detect all languages present
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("No response from Gemini API")
  }

  const responseText = result.candidates[0].content.parts[0].text

  try {
    // Try to parse as JSON
    const analysis = JSON.parse(responseText)

    return {
      complexity: analysis.complexity || "Medium",
      documentType: analysis.documentType || "Other",
      personNames: Array.isArray(analysis.personNames) ? analysis.personNames : [],
      languages: Array.isArray(analysis.languages) ? analysis.languages : ["en"],
      confidence: typeof analysis.confidence === "number" ? analysis.confidence : 0.8,
    }
  } catch (parseError) {
    // Fallback: extract information from text response
    console.warn("Failed to parse Gemini JSON response, using fallback parsing")

    return {
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

// Get Google Cloud access token for Document AI
async function getAccessToken(): Promise<string> {
  const CREDENTIALS_JSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (!CREDENTIALS_JSON) {
    throw new Error("Missing Google service account credentials")
  }

  try {
    // Parse the service account credentials
    const credentials = JSON.parse(CREDENTIALS_JSON)

    // Create GoogleAuth instance with service account credentials
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    })

    // Get authenticated client and access token
    const client = await auth.getClient()
    const accessTokenResponse = await client.getAccessToken()

    if (!accessTokenResponse.token) {
      throw new Error("Failed to get access token")
    }

    return accessTokenResponse.token
  } catch (error) {
    console.error("[v0] Error getting access token:", error)
    throw new Error(`Failed to authenticate with Google: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Update database with results
async function updateDatabaseResults(
  quoteId: string,
  fileName: string,
  ocrResults: Awaited<ReturnType<typeof processDocumentAIServer>>,
  geminiResults: Awaited<ReturnType<typeof processGeminiAnalysisServer>>,
) {
  const supabase = createClient()

  const { error } = await supabase
    .from("quote_files")
    .update({
      ocr_status: "completed",
      gem_status: "completed",
      word_count: ocrResults.wordCount,
      page_count: ocrResults.pageCount,
      detected_language: ocrResults.language,
      words_per_page: ocrResults.wordsPerPage,
      complexity: geminiResults.complexity,
      document_type: geminiResults.documentType,
      person_names: geminiResults.personNames,
      languages: geminiResults.languages,
      confidence: geminiResults.confidence,
    })
    .eq("quote_id", quoteId)
    .eq("file_name", fileName)

  if (error) {
    throw new Error(`Failed to update database: ${error.message}`)
  }
}
