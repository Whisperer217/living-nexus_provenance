/*
═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Upload Pipeline (Trust Layer)
   Normalized upload metadata extraction for all content types.
   All processing is CLIENT-SIDE — no data leaves the browser
   until the user explicitly submits.
═══════════════════════════════════════════════════════════════════ */

/** Normalized metadata extracted from any uploaded file */
export interface UploadMetadata {
  /** SHA-256 hex of the raw file bytes */
  fileHash: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** MIME type as reported by the browser */
  mimeType: string;
  /** Human-readable file name */
  fileName: string;

  // ── Audio-specific ──────────────────────────────────────────────
  /** Duration in seconds (audio/video only) */
  durationSeconds?: number;
  /** Sample rate in Hz (audio only) */
  sampleRate?: number;
  /** Bit depth (audio only) */
  bitDepth?: number;

  // ── Document-specific ───────────────────────────────────────────
  /** Page count (PDF/DOCX/manuscript/comic) */
  pageCount?: number;

  // ── Preview ─────────────────────────────────────────────────────
  /** Data URL of a generated preview thumbnail (cover page / first frame) */
  previewDataUrl?: string;
}

/** Compute SHA-256 hex from an ArrayBuffer */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extract metadata from an audio file using the Web Audio API.
 * Returns duration, sampleRate, and bitDepth (estimated from file size).
 */
export async function extractAudioMetadata(
  file: File,
  fileHash: string
): Promise<UploadMetadata> {
  const base: UploadMetadata = {
    fileHash,
    fileSizeBytes: file.size,
    mimeType: file.type,
    fileName: file.name,
  };

  try {
    const audioCtx = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    audioCtx.close();
    base.durationSeconds = decoded.duration;
    base.sampleRate = decoded.sampleRate;
    // Estimate bit depth from file size and duration (rough heuristic)
    if (decoded.duration > 0) {
      const bytesPerSecond = file.size / decoded.duration;
      // 44100 Hz × 2 channels × 2 bytes = 176400 bytes/s for 16-bit stereo
      base.bitDepth = bytesPerSecond > 150000 ? 24 : 16;
    }
  } catch {
    // Fallback: no audio metadata available
  }

  return base;
}

/**
 * Extract metadata from a PDF file.
 * Returns page count and a preview thumbnail of the first page.
 * Uses the browser's built-in PDF rendering via a canvas element.
 */
export async function extractPdfMetadata(
  file: File,
  fileHash: string
): Promise<UploadMetadata> {
  const base: UploadMetadata = {
    fileHash,
    fileSizeBytes: file.size,
    mimeType: file.type,
    fileName: file.name,
  };

  try {
    // Dynamically import pdfjs-dist (only loaded when needed)
    const pdfjsLib = await import("pdfjs-dist");
    // Use a CDN worker to avoid bundling issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    base.pageCount = pdf.numPages;

    // Render first page as thumbnail
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        base.previewDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      }
  } catch {
    // PDF.js not available or parsing failed — skip preview
  }

  return base;
}

/**
 * Extract metadata from a document file (non-PDF: DOCX, TXT, EPUB, etc.).
 * Returns file size and a simple text-based preview.
 */
export async function extractDocumentMetadata(
  file: File,
  fileHash: string
): Promise<UploadMetadata> {
  const base: UploadMetadata = {
    fileHash,
    fileSizeBytes: file.size,
    mimeType: file.type,
    fileName: file.name,
  };

  // For plain text files, estimate page count (250 words per page)
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    try {
      const text = await file.text();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      base.pageCount = Math.max(1, Math.ceil(wordCount / 250));
    } catch { /* ignore */ }
  }

  return base;
}

/**
 * Extract metadata from a comic/image file.
 * Returns a preview thumbnail of the first image.
 */
export async function extractComicMetadata(
  file: File,
  fileHash: string
): Promise<UploadMetadata> {
  const base: UploadMetadata = {
    fileHash,
    fileSizeBytes: file.size,
    mimeType: file.type,
    fileName: file.name,
  };

  // For image files, generate a thumbnail preview
  if (file.type.startsWith("image/")) {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      const MAX = 400;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        base.previewDataUrl = canvas.toDataURL("image/jpeg", 0.75);
      }
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }

  // For PDF comics, delegate to PDF extractor
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return extractPdfMetadata(file, fileHash);
  }

  return base;
}

/**
 * Master pipeline entry point.
 * Hashes the file, then dispatches to the correct extractor based on content type.
 */
export async function runUploadPipeline(
  file: File,
  contentType: "audio" | "lyrics" | "manuscript" | "comic"
): Promise<UploadMetadata> {
  const buffer = await file.arrayBuffer();
  const fileHash = await sha256Hex(buffer);

  switch (contentType) {
    case "audio":
      return extractAudioMetadata(file, fileHash);
    case "manuscript":
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        return extractPdfMetadata(file, fileHash);
      }
      return extractDocumentMetadata(file, fileHash);
    case "comic":
      return extractComicMetadata(file, fileHash);
    case "lyrics":
    default:
      return {
        fileHash,
        fileSizeBytes: file.size,
        mimeType: file.type,
        fileName: file.name,
      };
  }
}
