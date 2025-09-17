export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// PDF text extraction (no OCR)
import * as pdfjsLib from "pdfjs-dist";

// Optional Gemini summary
import { GoogleGenerativeAI } from "@google/generative-ai";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.ORDERS_BUCKET || "orders";

// Gemini config (optional). If GOOGLE_API_KEY is missing, we skip summarization.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Incoming file shapes
type IncomingFileA = { fileName: string; signedUrl: string };   // what your UI sends now
type IncomingFileB = { objectPath: string; file_name: string }; // server-side storage path variant

// ---- PDF text extraction via pdfjs-dist (no OCR) ----
async function extractWordCountsFromPdf(buffer: Buffer) {
  // IMPORTANT: On Node/serverless, disable the worker so we don't need workerSrc.
  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    disableWorker: true,       // <-- key fix
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
    // Avoid worker fetch paths in some environments
    // @ts-ignore (accepted by getDocument)
    useWorkerFetch: false,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  let totalWords = 0;
  const wordsPerPage: number[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ");
    const words = text.trim().split(/\s+/).filter(Boolean);
    wordsPerPage.push(words.length);
    totalWords += words.length;
  }

  return { page_count: pageCount, total_word_count: totalWords, words_per_page: wordsPerPage };
}

// ---- Optional Gemini summary ----
async function summarizeWithGemini(text: string, apiKey: string, modelName: string) {
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Cap text length; keep prompt smallish for latency/cost
    const cap = 180_000;
    const snippet = text.length > cap ? text.slice(0, cap) : text;

    const prompt =
      "Summarize the following PDF text into 5 concise bullet points (English). " +
      "Focus on names, dates, amounts, and key actions/decisions. If the text is noisy, do your best.\n\n" +
      snippet;

    const res = await model.generateContent(prompt);
    return res.response?.text?.() || null;
  } catch (e) {
    console.error("[Gemini] summary failed", e);
    return null;
  }
}

async function listObjectsForQuote(sb: ReturnType<typeof createClient>, quoteId: string) {
  // Your upload path convention is "<quote_id>/<file>"
  const prefix = `${quoteId}/`;
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`List failed: ${error.message}`);
  return (data || [])
    .filter((f) => f?.name && !f.name.endsWith("/"))
    .map((f) => ({
      objectPath: `${prefix}${f.name}`,
      file_name: f.name,
    })) as IncomingFileB[];
}

export async function POST(req: NextRequest) {
  try {
    // Env checks
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[DIAG] Supabase env missing", {
        hasUrl: !!SUPABASE_URL,
        hasRoleKey: !!SERVICE_ROLE,
        bucket: BUCKET,
      });
      return NextResponse.json({ error: "Server misconfigured: Supabase env" }, { status: 500 });
    }

    const body = await req.json();
    const quote_id: string = body?.quote_id;
    let files: Array<IncomingFileA | IncomingFileB> = body?.files;

    if (!quote_id) return NextResponse.json({ error: "quote_id is required" }, { status: 400 });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // If files not provided, list everything under "<quote_id>/"
    if (!files || !files.length) {
      files = await listObjectsForQuote(sb, quote_id);
    }

    console.log("[SERVER] [v0] Document processing API called with quote_id:", quote_id);
    console.log("[SERVER] [v0] Number of files to process:", files.length);

    const results: Array<{
      file_name: string;
      page_count: number;
      total_word_count: number;
      words_per_page: number[];
      gemini_summary?: string | null;
    }> = [];

    for (const f of files) {
      // Normalize to a filename + URL to download bytes
      let fileName: string | undefined;
      let readUrl: string | undefined;

      if ("signedUrl" in f && f.signedUrl) {
        fileName = ("fileName" in f && f.fileName) ? f.fileName : "document.pdf";
        readUrl = f.signedUrl;
      } else if ("objectPath" in f && f.objectPath) {
        fileName = ("file_name" in f && f.file_name) ? f.file_name : f.objectPath.split("/").pop() || "document.pdf";
        const { data: signed, error: signErr } = await sb.storage
          .from(BUCKET)
          .createSignedUrl(f.objectPath, 60);
        if (signErr || !signed?.signedUrl) {
          console.error("[SERVER] [v0] Signed URL error", { objectPath: f.objectPath, signErr });
          results.push({ file_name: fileName, page_count: 0, total_word_count: 0, words_per_page: [] });
          continue;
        }
        readUrl = signed.signedUrl;
      } else {
        console.error("[SERVER] [v0] Skipping file with unsupported shape:", f);
        results.push({ file_name: "unknown", page_count: 0, total_word_count: 0, words_per_page: [] });
        continue;
      }

      console.log("[SERVER] [v0] Processing file:", fileName);

      // Download bytes
      const r = await fetch(readUrl);
      if (!r.ok) {
        console.error("[SERVER] [v0] Download failed", { fileName, status: r.status, text: await r.text().catch(() => "") });
        results.push({ file_name: fileName, page_count: 0, total_word_count: 0, words_per_page: [] });
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());

      // Extract text/word counts (no OCR)
      let page_count = 0, total_word_count = 0, words_per_page: number[] = [];
      let gemini_summary: string | null | undefined = undefined;

      try {
        const { page_count: pc, total_word_count: tw, words_per_page: wpp } =
          await extractWordCountsFromPdf(buf);
        page_count = pc;
        total_word_count = tw;
        words_per_page = wpp;

        // Optional Gemini summary (first few pages snippet)
        if (GOOGLE_API_KEY && total_word_count > 0) {
          try {
            const loading = pdfjsLib.getDocument({
              data: buf,
              disableWorker: true,   // <-- also add here
              isEvalSupported: false,
              disableFontFace: true,
              useSystemFonts: true,
              // @ts-ignore
              useWorkerFetch: false,
            });
            const pdf = await loading.promise;
            const maxPages = Math.min(5, pdf.numPages);
            let sample = "";
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              sample +=
                content.items
                  .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
                  .join(" ") + "\n\n";
            }
            gemini_summary = await summarizeWithGemini(sample, GOOGLE_API_KEY, GEMINI_MODEL);
          } catch (e) {
            console.error("[Gemini] sampling failed", e);
          }
        }
      } catch (e) {
        console.error("[PDF] extract failed", e);
      }

      results.push({
        file_name: fileName,
        page_count,
        total_word_count,
        words_per_page,
        ...(gemini_summary ? { gemini_summary } : {}),
      });
    }

    console.log("[SERVER] [v0] Document processing complete. Results:", JSON.stringify(results));
    return NextResponse.json({ results });
  } catch (e: any) {
    console.error("[SERVER] [v0] Process-documents error", {
      message: e?.message,
      code: e?.code,
      details: e?.details,
      stack: e?.stack,
    });
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}
