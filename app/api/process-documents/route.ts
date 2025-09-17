// app/api/process-document/route.ts
export const runtime = "nodejs";          // IMPORTANT: Adobe SDK needs Node
export const dynamic = "force-dynamic";   // avoid caching on Vercel

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
 * Helper: list all objects under orders/{quote_id}/ if the caller didn't specify files explicitly
 */
async function listObjectsForQuote(sb: ReturnType<typeof createClient>, quoteId: string) {
  const prefix = `orders/${quoteId}/`;
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`List failed: ${error.message}`);
  return (data || [])
    .filter((f) => f?.name && !f.name.endsWith("/"))
    .map((f) => ({
      objectPath: `${prefix}${f.name}`,
      file_name: f.name,
      mimeType: guessMime(f.name),
    }));
}

function guessMime(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".tif") || n.endsWith(".tiff")) return "image/tiff";
  return "application/octet-stream";
}

/**
 * Parse Adobe Extract ZIP buffer to compute page and word counts.
 * We look for structuredData.json and count words by page from the elements.
 */
async function analyzeExtractZip(zipBuffer: Buffer) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const sd = zip.file("structuredData.json");
  if (!sd) {
    return { page_count: 0, total_word_count: 0, words_per_page: [] as number[] };
  }
  const json = JSON.parse(await sd.async("string"));

  // JSON shape varies; we try to be resilient:
  // Collect words keyed by pageNumber if present; otherwise lump into page 1.
  const wordsPerPage: Record<number, number> = {};
  const addWord = (page: number) => {
    wordsPerPage[page] = (wordsPerPage[page] || 0) + 1;
  };

  // Try common locations for text elements
  const traverse = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    // Adobe often uses "Text" or "text" spans with path->pageNumber
    const pageNum =
      node.pageNumber ??
      node.PageNumber ??
      node.page_index ??
      node.pageIndex ??
      1;

    if (node.Text || node.text) {
      // Split by whitespace to approximate word count
      const text = String(node.Text ?? node.text);
      const words = text.trim().split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i++) addWord(pageNum);
    }

    for (const k of Object.keys(node)) traverse(node[k]);
  };

  traverse(json);

  const pages = Object.keys(wordsPerPage).map((k) => Number(k));
  const page_count = pages.length ? Math.max(...pages) : 0;
  const words_per_page: number[] = [];
  for (let i = 1; i <= page_count; i++) {
    words_per_page.push(wordsPerPage[i] || 0);
  }
  const total_word_count = words_per_page.reduce((a, b) => a + b, 0);
  return { page_count, total_word_count, words_per_page };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quote_id: string = body?.quote_id;
    let files: Array<{ objectPath: string; file_name: string; mimeType?: string }> = body?.files;

    if (!quote_id) {
      return NextResponse.json({ error: "quote_id is required" }, { status: 400 });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // If files not provided, list everything under orders/{quote_id}/
    if (!files || !files.length) {
      files = await listObjectsForQuote(sb, quote_id);
    }

    console.log("[SERVER] [v0] Document processing API called with quote_id:", quote_id);
    console.log("[SERVER] [v0] Number of files to process:", files.length);

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

      // Create a short-lived signed URL to read the file bytes from Supabase
      const { data: signed, error: signErr } = await sb.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60);
      if (signErr || !signed?.signedUrl) {
        throw new Error(`Signed read URL failed for ${file_name}: ${signErr?.message || "Unknown"}`);
      }

      // Fetch bytes → Buffer → Node Readable stream
      const r = await fetch(signed.signedUrl);
      if (!r.ok) throw new Error(`Download failed for ${file_name}: ${await r.text()}`);
      const ab = await r.arrayBuffer();
      const buf = Buffer.from(ab);
      const nodeStream = Readable.from(buf);

      console.log("[SERVER] Processing PDF", file_name, "with Adobe PDF Services");

      // Build Adobe FileRef from Node stream
      const fileRef = PDFServicesSdk.FileRef.createFromStream(nodeStream, "application/pdf");

      // Run Extract operation (you can swap in OCR/other operations if you prefer)
      const extract = PDFServicesSdk.ExtractPDF.Operation.createNew();
      extract.setInput(fileRef);
      // You can set options here if needed:
      // const options = new PDFServicesSdk.ExtractPDF.options.ExtractPDFOptions.Builder().build();
      // extract.setOptions(options);

      let page_count = 0;
      let total_word_count = 0;
      let words_per_page: number[] = [];

      try {
        const resultRef = await extract.execute(ctx);
        const zipBuffer = await resultRef.read(); // Buffer of zip
        const stats = await analyzeExtractZip(zipBuffer);
        page_count = stats.page_count;
        total_word_count = stats.total_word_count;
        words_per_page = stats.words_per_page;
      } catch (e: any) {
        console.error("[SERVER] [v0] Adobe PDF processing failed for", file_name, ":", e?.message || e);
        // Leave counts at 0 to match your current shape; still push a result so UI stays consistent
      }

      results.push({
        file_name,
        page_count,
        total_word_count,
        words_per_page,
      });
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
