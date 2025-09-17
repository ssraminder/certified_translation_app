import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sanitizeForPath } from "@/lib/sanitize-for-path"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = process.env.ORDERS_BUCKET || "orders"

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[v0] Missing environment variables:", {
        hasUrl: !!SUPABASE_URL,
        hasServiceRole: !!SERVICE_ROLE,
      })
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const { filename, quote_id, operation = "upload" } = await req.json()
    console.log("[v0] Signed URL request:", { filename, quote_id, operation })

    if (!filename || !quote_id) {
      return NextResponse.json({ error: "filename and quote_id are required" }, { status: 400 })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE)

    const safeName = sanitizeForPath(filename)
    const objectPath = `${quote_id}/${safeName}`

    console.log("[v0] Creating signed URL for path:", objectPath)

    if (operation === "read") {
      // Create signed URL for reading/downloading
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(objectPath, 3600) // 1 hour expiry

      if (error || !data) {
        console.error("[v0] Supabase storage error (read):", error)
        return NextResponse.json(
          {
            error: error?.message || "Failed to create signed read URL",
          },
          { status: 500 },
        )
      }

      console.log("[v0] Successfully created signed read URL")

      return NextResponse.json({
        signedUrl: data.signedUrl,
        storageBackend: "SUPABASE",
        sourceUri: `supabase://orders/${objectPath}`,
      })
    } else {
      // Create signed URL for uploading (default behavior)
      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(objectPath, { upsert: true })

      if (error || !data) {
        console.error("[v0] Supabase storage error (upload):", error)
        return NextResponse.json(
          {
            error: error?.message || "Failed to create signed upload URL",
          },
          { status: 500 },
        )
      }

      console.log("[v0] Successfully created signed upload URL")

      return NextResponse.json({
        uploadUrl: data.signedUrl,
        storageBackend: "SUPABASE",
        sourceUri: `supabase://orders/${objectPath}`,
      })
    }
  } catch (e: any) {
    console.error("[v0] Unexpected error in signed-url endpoint:", e)
    return NextResponse.json(
      {
        error: e?.message || "Internal server error",
      },
      { status: 500 },
    )
  }
}
