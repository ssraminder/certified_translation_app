import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { streamFromSupabase } from "@/lib/supabase"
import { uploadFileToGemini, analyzeHybrid } from "@/lib/gemini"
import type { GeminiHybridRequest, GeminiHybridResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Actions Taken: Processing Gemini hybrid analysis request")

    const body: GeminiHybridRequest = await request.json()
    const { quote_id, objectPath, sampleStrategy, everyN, maxPages, instructions } = body

    if (!quote_id || !objectPath) {
      return NextResponse.json({ error: "Missing required fields: quote_id, objectPath" }, { status: 400 })
    }

    console.log(`[v0] Starting hybrid analysis for ${objectPath}`)

    // Update status to gemini_running
    await supabaseServer
      .from("quote_submissions")
      .update({
        status: "gemini_running",
        last_message: "Starting Gemini hybrid analysis",
        updated_at: new Date().toISOString(),
      })
      .eq("quote_id", quote_id)

    // Get the file from Supabase and upload to Gemini
    console.log("[v0] Streaming file from Supabase to Gemini")
    const fileStream = await streamFromSupabase("orders", objectPath)
    const filename = objectPath.split("/").pop() || "document.pdf"
    const geminiFileUri = await uploadFileToGemini(fileStream, filename)

    // Get OCR text blocks from the database (from previous DocAI processing)
    const { data: fileData, error: fileError } = await supabaseServer
      .from("quote_files")
      .select("*")
      .eq("quote_id", quote_id)
      .eq("storage_path", `orders/${objectPath}`)
      .single()

    if (fileError) {
      console.error("[v0] Error fetching file data:", fileError)
      return NextResponse.json({ error: "File not found in database" }, { status: 404 })
    }

    // Extract OCR text blocks (this would come from DocAI output in a real implementation)
    const ocrTextBlocks: string[] = []
    if (fileData.docai_output_uri) {
      // In a real implementation, we would fetch and parse the DocAI JSON outputs
      // For now, we'll use a placeholder
      ocrTextBlocks.push("OCR text would be extracted from Document AI outputs")
    }

    // Perform hybrid analysis
    console.log("[v0] Performing Gemini hybrid analysis")
    const analysisResult = await analyzeHybrid(
      geminiFileUri,
      ocrTextBlocks,
      sampleStrategy,
      everyN,
      maxPages,
      instructions,
    )

    // Update database with results
    const updateData = {
      gemini_visual_complexity_json: analysisResult.visual,
      gemini_visual_complexity_score: analysisResult.visual.score,
      gemini_visual_complexity_class: analysisResult.visual.class,
      gemini_text_summary: analysisResult.text.summary,
      gemini_text_json: analysisResult.text,
      gem_status: "completed",
      gem_message: "Hybrid analysis completed successfully",
      updated_at: new Date().toISOString(),
    }

    await supabaseServer
      .from("quote_files")
      .update(updateData)
      .eq("quote_id", quote_id)
      .eq("storage_path", `orders/${objectPath}`)

    // Update submission status
    await supabaseServer
      .from("quote_submissions")
      .update({
        status: "gemini_done",
        last_message: "Gemini hybrid analysis completed",
        updated_at: new Date().toISOString(),
      })
      .eq("quote_id", quote_id)

    const response: GeminiHybridResponse = {
      ok: true,
      visual: {
        score: analysisResult.visual.score,
        class: analysisResult.visual.class,
      },
      text: {
        summary: analysisResult.text.summary,
      },
    }

    console.log("[v0] Successfully completed Gemini hybrid analysis")
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error in gemini/analyze-hybrid endpoint:", error)

    // Update error status
    const body = await request.json().catch(() => ({}))
    if (body.quote_id) {
      await supabaseServer
        .from("quote_submissions")
        .update({
          status: "error",
          last_message: `Gemini analysis error: ${error}`,
          updated_at: new Date().toISOString(),
        })
        .eq("quote_id", body.quote_id)
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
