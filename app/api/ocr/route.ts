import { type NextRequest, NextResponse } from "next/server"

// Redirect to the correct OCR endpoint
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Forward to the correct endpoint
  const response = await fetch(`${request.nextUrl.origin}/api/run-vision-ocr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return NextResponse.json(data)
}
