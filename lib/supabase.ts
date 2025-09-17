import { createClient } from "@supabase/supabase-js"
import { ReadableStream } from "stream/web"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL environment variable")
}

if (!supabaseServiceKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Server-side client with service role key
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

// Client-side client with anon key
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Function to sanitize filenames
function sanitizeFilename(filename: string): string {
  // Remove or replace problematic characters
  return filename
    .replace(/[^\w\s.-]/g, "_") // Replace special chars with underscore
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, "") // Remove leading/trailing underscores
}

// Function to stream data from Supabase
export async function streamFromSupabase(bucketName: string, path: string): Promise<ReadableStream> {
  const { data, error } = await supabaseServer.storage.from(bucketName).download(path)

  if (error) {
    throw new Error(`Failed to download from Supabase: ${error.message}`)
  }

  if (!data) {
    throw new Error("No data received from Supabase")
  }

  // Convert Blob to ReadableStream for Node.js environment
  const arrayBuffer = await data.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  return new ReadableStream({
    start(controller) {
      controller.enqueue(uint8Array)
      controller.close()
    },
  })
}

// Function to get file information
export async function getFileInfo(bucketName: string, path: string) {
  const { data, error } = await supabaseServer.storage.from(bucketName).list(path.split("/").slice(0, -1).join("/"), {
    search: path.split("/").pop(),
  })

  if (error) {
    throw new Error(`Failed to get file info: ${error.message}`)
  }

  return data?.[0]
}
