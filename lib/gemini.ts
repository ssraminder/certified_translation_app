export async function uploadFileToGemini(fileStream: ReadableStream, filename: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY!

  // Convert stream to buffer for upload
  const reader = fileStream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const fileBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    fileBuffer.set(chunk, offset)
    offset += chunk.length
  }

  // Upload file to Gemini Files API
  const uploadResponse = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "multipart",
      "X-Goog-Api-Key": geminiApiKey,
      "Content-Type": "multipart/related; boundary=boundary123",
    },
    body: createMultipartBody(fileBuffer, filename),
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Failed to upload file to Gemini: ${uploadResponse.status} ${errorText}`)
  }

  const uploadResult = await uploadResponse.json()
  console.log(`[v0] Successfully uploaded file to Gemini: ${uploadResult.file.uri}`)

  return uploadResult.file.uri
}

export async function analyzeHybrid(
  fileUri: string,
  ocrTextBlocks: string[],
  sampleStrategy = "every_page",
  everyN = 1,
  maxPages = 50,
  instructions = "",
): Promise<any> {
  const geminiApiKey = process.env.GEMINI_API_KEY!
  const geminiModel = process.env.GEMINI_MODEL || "models/gemini-1.5-pro-latest"

  const systemPrompt = `You are a document vision and language analysis specialist. You will receive (1) a PDF file reference for visual/layout analysis and (2) OCR text blocks from Document AI. Combine both to assess complexity and summarize content. Return ONLY JSON conforming to schema. No prose.`

  const userPrompt = {
    task: "hybrid_visual_and_text_analysis",
    file_reference: fileUri,
    ocr_text_blocks: ocrTextBlocks,
    sample_strategy: sampleStrategy,
    every_n: everyN,
    max_pages: maxPages,
    instructions: instructions,
    definitions: {
      complexity: "Expected OCR/QA effort based on visual layout complexity and text density",
      classes: {
        simple: "Clean layout, standard fonts, minimal graphics",
        medium: "Some complex formatting, tables, or mixed content",
        complex: "Dense layouts, multiple columns, extensive graphics",
        very_complex: "Highly complex layouts, handwriting, poor quality scans",
      },
      scoring: "0.0-1.0 scale where 0.0 is simplest and 1.0 is most complex",
    },
    return_json_schema: {
      visual: {
        score: 0.0,
        class: "simple|medium|complex|very_complex",
        features: {
          has_tables: false,
          has_images: false,
          has_handwriting: false,
          multiple_columns: false,
          poor_quality: false,
        },
        evidence: [
          {
            page: 1,
            issues: ["example issue description"],
          },
        ],
        notes: "Brief analysis of visual complexity",
      },
      text: {
        summary: "Brief summary of document content and purpose",
        languages: ["en"],
        qualityFlags: ["good_ocr", "clear_text"],
        sections: [
          {
            title: "Section name",
            pages: [1, 2],
          },
        ],
      },
    },
  }

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt + "\n\n" + JSON.stringify(userPrompt, null, 2),
          },
          {
            fileData: {
              mimeType: "application/pdf",
              fileUri: fileUri,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API request failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()

  if (!result.candidates || result.candidates.length === 0) {
    throw new Error("No response from Gemini API")
  }

  const responseText = result.candidates[0].content.parts[0].text
  console.log(`[v0] Raw Gemini response: ${responseText}`)

  // Parse JSON response
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonText = jsonMatch ? jsonMatch[1] : responseText

    const analysisResult = JSON.parse(jsonText)
    console.log("[v0] Successfully parsed Gemini analysis result")

    return analysisResult
  } catch (parseError) {
    console.error("[v0] Failed to parse Gemini response as JSON:", parseError)
    console.error("[v0] Raw response:", responseText)

    // Return fallback analysis
    return {
      visual: {
        score: 0.5,
        class: "medium",
        features: {
          has_tables: false,
          has_images: false,
          has_handwriting: false,
          multiple_columns: false,
          poor_quality: false,
        },
        evidence: [],
        notes: "Analysis completed with fallback due to parsing error",
      },
      text: {
        summary: "Document analysis completed",
        languages: ["en"],
        qualityFlags: ["processed"],
        sections: [],
      },
    }
  }
}

function createMultipartBody(fileBuffer: Uint8Array, filename: string): string {
  const boundary = "boundary123"
  const metadata = {
    file: {
      displayName: filename,
      mimeType: "application/pdf",
    },
  }

  let body = `--${boundary}\r\n`
  body += `Content-Type: application/json; charset=utf-8\r\n\r\n`
  body += `${JSON.stringify(metadata)}\r\n`
  body += `--${boundary}\r\n`
  body += `Content-Type: application/pdf\r\n\r\n`

  // Convert buffer to string for multipart body
  const fileString = String.fromCharCode(...fileBuffer)
  body += fileString
  body += `\r\n--${boundary}--\r\n`

  return body
}
