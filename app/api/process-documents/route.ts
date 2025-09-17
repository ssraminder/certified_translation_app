// app/api/process-document/route.ts
// Runs on Node (not Edge) so Adobe PDF Services SDK works.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Readable } from "stream";
import JSZip from "jszip";
import PDFServicesSdk from "@adobe/pdfservices-node-sdk";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.ORDERS_BUCKET || "orders";

const ADOBE_ID = process.env.ADOBE_PDF_CLIENT_ID!;
const ADOBE_SECRET = process.env.ADOBE_PDF_CLIENT_SECRET!;

/**
 * Infer a basic mime type from file name.
 */
function guessMime(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".tif") || n.endsWith(".tiff")) return "image/tiff";
  return "application/octet-stream";
}

/**
 * Parse Adobe Extract ZIP buffer to compute page & word counts.
 * It reads structuredData.json and traverses for text content.
 */
async function analyzeExtractZip(zipBuffer: Buffer) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const sd = zip.file("structuredData.json");
  if (!sd) {
    return { page_count: 0, total_word_count: 0, words_per_page: [] as number[] };
  }
  const json = JSON.parse(await sd.async("string"));

  // Collect words per page (fallback to page 1 if not present)
  const perPage: Record<number, number> = {};
  const addWord = (page: number) => {
    perPage[page] = (perPage[page] || 0) + 1;
  };

  const traverse = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    // Try several keys Adobe may use
    const pageNum =
      node.pageNumber ??
      node.PageNumber ??
      node.page_index ??
      node.pageIndex ??
      1;

    if (node.Text || node.text) {
      const text = String(node.Text ?? node.text);
      const words = text.trim().split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i++) addWord(pageNum);
    }

    for (const k of Object.keys(node)) traverse(node[k]);
  };

  traverse(json);

  const pages = Object.keys(perPage).map(Number);
  const page_count = pages.length ? Math.max(...pages) : 0;
  const words_per_page: number[] = [];
  for (let i = 1; i <= page_count; i++) words_per_page.push(perPage[i] || 0);
  const total_word_count = words_per_page.reduce((a, b) => a + b, 0);

  return { page_count, total_word_count, words_per_page };
}

/**
 * If the client doesn’t pass explicit files, list everything under <quote_id>/ in the bucket.
 * NOTE: Your logs show you’re storing objects at: "<quote_id>/<filename>" (no "orders/" prefix).
 */
async function listObjectsForQuote(sb: ReturnType<typeof createClient>, quoteId: string) {
  const prefix = `${quoteId}/`; // <- IMPORTANT: matches your current upload path
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`List failed: ${error.message}`);
  return (data || [])
    .filter((f) => f?.name && !f.name.endsWith("/"))
    .map((f) => ({
      objectPath: `${prefix}${f.name}`, // "<quote_id>/<file>"
      file_name: f.name,
      mimeType: guessMime(f.name),
    }));
}

export async function POST(req: NextRequest) {
  try {
    // ---- DIAGNOSTIC: env checks up front ----
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[DIAG] Supabase env missing", {
        hasUrl: !!SUPABASE_URL,
        hasRoleKey: !!SERVICE_ROLE,
        bucket: BUCKET,
      });
      return NextResponse.json({ error: "Server misconfigured: Supabase env" }, { status: 500 });
    }
    if (!ADOBE_ID || !ADOBE_SECRET) {
      console.error("[DIAG] Adobe env missing", { hasId: !!ADOBE_ID, hasSecret: !!ADOBE_SECRET });
      return NextResponse.json({ error: "Server misconfigured: Adobe env" }, { status: 500 });
    }

    const body = await req.json();
    const quote_id: string = body?.quote_id;
    let files: Array<{ objectPath: string; file_name: string; mimeType?: string }> = body?.files;

    if (!quote_id) {
      return NextResponse.json({ error: "quote_id is required" }, { status: 400 });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // If files not provided, list everything under "<quote_id>/"
    if (!files || !files.length) {
      files = await listObjectsForQuote(sb, quote_id);
    }

    console.log("[SERVER] [v0] Document processing API called with quote_id:", quote_id);
    console.log("[SERVER] [v0] Number of files to process:", files.length);

    // ---- Adobe client ----
    const creds = PDFServicesSdk.Credentials
      .servicePrincipalCredentialsBuilder()
      .withClientId(ADOBE_ID)
      .withClientSecret(ADOBE_SECRET)
      .build();
    const ctx = PDFServicesSdk.ExecutionContext.create(creds);

    const results: Array<{
      file_name: string;
      page_count: number;
      total_word_count: number;
      words_per_page: number[];
    }> = [];

    for (const f of files) {
      const { objectPath, file_name } = f;
      console.log("[SERVER] [v0] Processing file:", file_name);

      // Short-lived signed read URL for Supabase object
      const { data: signed, error: signErr } = await sb.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60);
      if (signErr || !signed?.signedUrl) {
        console.error("[SERVER] [v0] Signed URL error", { objectPath, signErr });
        results.push({ file_name, page_count: 0, total_word_count: 0, words_per_page: [] });
        continue;
      }

      // Download -> Buffer -> Node Readable stream
      const r = await fetch(signed.signedUrl);
      if (!r.ok) {
        console.error("[SERVER] [v0] Download failed", { objectPath, status: r.status, text: await r.text().catch(() => "") });
        results.push({ file_name, page_count: 0, total_word_count: 0, words_per_page: [] });
        continue;
      }
      const ab = await r.arrayBuffer();
      const buf = Buffer.from(ab);
      const nodeStream = Readable.from(buf);

      console.log("[SERVER] Processing PDF", file_name, "with Adobe PDF Services");

      // Adobe: build FileRef from Node stream and run Extract
      const fileRef = PDFServicesSdk.FileRef.createFromStream(nodeStream, "application/pdf");
      const extract = PDFServicesSdk.ExtractPDF.Operation.createNew();
      extract.setInput(fileRef);

      try {
        const resultRef = await extract.execute(ctx);
        const zipBuffer = await resultRef.read(); // Buffer (ZIP)
        const stats = await analyzeExtractZip(zipBuffer);

        results.push({
          file_name,
          page_count: stats.page_count,
          total_word_count: stats.total_word_count,
          words_per_page: stats.words_per_page,
        });
      } catch (e: any) {
        console.error("[Adobe] execute() failed", {
          file: file_name,
          message: e?.message,
          code: e?.code,
          details: e?.details,
          errors: e?.errors,
          stack: e?.stack,
        });
        // Keep shape consistent; counts 0 on failure
        results.push({
          file_name,
          page_count: 0,
          total_word_count: 0,
          words_per_page: [],
        });
      }
    }

    console.log("[SERVER] [v0] Document processing complete. Results:", JSON.stringify(results));
    return NextResponse.json(results);
  } catch (e: any) {
    console.error("[SERVER] [v0] Process-document error", {
      message: e?.message,
      code: e?.code,
      details: e?.details,
      stack: e?.stack,
    });
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}
