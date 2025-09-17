import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface ProcessDocumentsRequest {
  quote_id: string
  files: Array<{ fileName: string; signedUrl: string }>
}

interface ProcessResult {
  file_name: string
  page_count: number
  total_word_count: number
  words_per_page: number[]
}

async function processWithAdobePDF(
  fileBuffer: ArrayBuffer,
  fileName: string,
): Promise<{
  totalWordCount: number
  pageCount: number
  wordsPerPage: number[]
  fullText: string
}> {
  console.log(`[v0] Processing PDF ${fileName} with Adobe PDF Services`)

  // Adobe PDF Services API implementation
  const clientId = process.env.ADOBE_CLIENT_ID
  const clientSecret = process.env.ADOBE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Missing Adobe PDF Services credentials")
  }

  try {
    // Get access token
    const tokenResponse = await fetch("https://ims-na1.adobelogin.com/ims/token/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "openid,AdobeID,read_organizations,additional_info.projectedProductContext,additional_info.job_function",
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Adobe token request failed: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Upload document
    const uploadResponse = await fetch(
      "https://cpf-ue1.adobe.io/ops/:create?respondWith=%7B%22reltype%22%3A%22http%3A//ns.adobe.com/rel/primary%22%7D",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": clientId,
          "Content-Type": "application/pdf",
        },
        body: fileBuffer,
      },
    )

    if (!uploadResponse.ok) {
      throw new Error(`Adobe upload failed: ${uploadResponse.statusText}`)
    }

    const uploadData = await uploadResponse.json()
    const assetId = uploadData.assetID

    // Extract text
    const extractResponse = await fetch("https://cpf-ue1.adobe.io/ops/:create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-api-key": clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assetID: assetId,
        renditions: [
          {
            type: "application/vnd.adobe.extractapi+json",
          },
        ],
      }),
    })

    if (!extractResponse.ok) {
      throw new Error(`Adobe extraction failed: ${extractResponse.statusText}`)
    }

    const extractData = await extractResponse.json()

    // Parse results
    const elements = extractData.elements || []
    let fullText = ""
    let totalWordCount = 0
    const wordsPerPage: number[] = []
    let currentPage = 1
    let currentPageWords = 0

    elements.forEach((element: any) => {
      if (element.Text) {
        fullText += element.Text + " "
        const words = element.Text.trim()
          .split(/\s+/)
          .filter((w: string) => w.length > 0)

        if (element.Page && element.Page !== currentPage) {
          wordsPerPage.push(currentPageWords)
          currentPage = element.Page
          currentPageWords = 0
        }

        currentPageWords += words.length
        totalWordCount += words.length
      }
    })

    if (currentPageWords > 0) {
      wordsPerPage.push(currentPageWords)
    }

    const pageCount = wordsPerPage.length || 1

    console.log(`[v0] Adobe PDF processed ${fileName}: ${totalWordCount} words across ${pageCount} pages`)

    return {
      totalWordCount,
      pageCount,
      wordsPerPage,
      fullText: fullText.trim(),
    }
  } catch (error) {
    console.error(`[v0] Adobe PDF processing failed for ${fileName}:`, error)
    throw error
  }
}

async function processWithCloudVision(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<{
  totalWordCount: number
  pageCount: number
  wordsPerPage: number[]
  fullText: string
}> {
  console.log(`[v0] Processing image ${fileName} with Google Cloud Vision`)

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (!projectId || !credentialsJson) {
    throw new Error("Missing Google Cloud Vision credentials")
  }

  try {
    // Parse service account credentials
    const credentials = JSON.parse(credentialsJson)

    // Create JWT token for authentication
    const { SignJWT } = await import("jose")
    const { importPKCS8 } = await import("jose")
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
      throw new Error(`Vision token request failed: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Process with Cloud Vision OCR
    const base64Content = Buffer.from(fileBuffer).toString("base64")

    const visionResponse = await fetch(`https://vision.googleapis.com/v1/projects/${projectId}/images:annotate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
                type: "TEXT_DETECTION",
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    })

    if (!visionResponse.ok) {
      throw new Error(`Vision API failed: ${visionResponse.statusText}`)
    }

    const visionData = await visionResponse.json()
    const textAnnotations = visionData.responses?.[0]?.textAnnotations || []

    let fullText = ""
    if (textAnnotations.length > 0) {
      fullText = textAnnotations[0].description || ""
    }

    const words = fullText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    const totalWordCount = words.length
    const pageCount = 1 // Images are single page
    const wordsPerPage = [totalWordCount]

    console.log(`[v0] Cloud Vision processed ${fileName}: ${totalWordCount} words`)

    return {
      totalWordCount,
      pageCount,
      wordsPerPage,
      fullText,
    }
  } catch (error) {
    console.error(`[v0] Cloud Vision processing failed for ${fileName}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessDocumentsRequest = await request.json()
    const { quote_id, files } = body

    if (!quote_id || !files || !Array.isArray(files)) {
      return NextResponse.json({
        status: "error",
        message: "Invalid request body. Expected quote_id and files array.",
      })
    }

    console.log("[v0] Document processing API called with quote_id:", quote_id)
    console.log("[v0] Number of files to process:", files.length)

    const supabase = await createClient()
    const results: ProcessResult[] = []

    // Process each file
    for (const file of files) {
      try {
        console.log(`[v0] Processing file: ${file.fileName}`)

        const fileExtension = file.fileName.toLowerCase().split(".").pop()
        const isImageFile = ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension || "")
        const isPdfFile = fileExtension === "pdf"

        if (!isImageFile && !isPdfFile) {
          console.log(`[v0] Skipping processing for ${file.fileName} - unsupported file type (${fileExtension})`)

          await supabase.from("quote_files").upsert(
            {
              quote_id,
              file_name: file.fileName,
              ocr_status: "skipped",
              ocr_message: "Processing skipped - file type not supported",
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

        let documentResult

        if (isPdfFile) {
          documentResult = await processWithAdobePDF(buffer, file.fileName)
        } else {
          const mimeType = `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`
          documentResult = await processWithCloudVision(buffer, file.fileName, mimeType)
        }

        const totalWordCount = documentResult.totalWordCount
        const pageCount = documentResult.pageCount
        const wordsPerPage = documentResult.wordsPerPage

        const { error: dbError } = await supabase.from("quote_files").upsert(
          {
            quote_id,
            file_name: file.fileName,
            ocr_status: "completed",
            ocr_message: null,
            words_per_page: wordsPerPage,
            total_word_count: totalWordCount,
            detected_language: "unknown", // Could be enhanced with language detection
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
            ocr_message: fileError instanceof Error ? fileError.message : "Unknown error during processing",
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

    console.log("[v0] Document processing complete. Results:", results)

    return NextResponse.json({
      status: "success",
      results,
      message: `Successfully processed ${results.length} files`,
    })
  } catch (error) {
    console.error("[v0] Document processing API Error:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred during document processing",
    })
  }
}
