import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quote_id = searchParams.get("quote_id")

    if (!quote_id) {
      return NextResponse.json({
        status: "error",
        message: "quote_id required",
      })
    }

    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .from("quote_files")
      .select(`
        file_name,
        ocr_status,
        ocr_message,
        words_per_page,
        total_word_count,
        detected_language,
        gem_status,
        gem_message,
        gem_languages_all,
        gem_page_complexity,
        gem_page_doc_types,
        gem_page_names,
        gem_page_languages,
        gem_page_confidence
      `)
      .eq("quote_id", quote_id)
      .order("file_name")

    if (error) {
      console.error("[fetch-quote-files] Database error:", error)
      return NextResponse.json({
        status: "error",
        message: "Failed to fetch quote files from database",
      })
    }

    return NextResponse.json({
      status: "ok",
      rows: rows || [],
    })
  } catch (error) {
    console.error("[fetch-quote-files] API Error:", error)
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
}
