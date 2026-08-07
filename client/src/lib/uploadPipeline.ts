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
// ─── vNext additions appended to uploadPipeline.ts ───────────────────────────

export interface FileMetadata {
  fileName: string; fileType: string; fileSizeBytes: number;
  sha256: string; md5?: string; creationDate?: string; modifiedDate?: string;
}
export interface ImageMetadata {
  width?: number; height?: number; resolution?: string; colorProfile?: string; orientation?: number;
  cameraMake?: string; cameraModel?: string; lens?: string; iso?: number; aperture?: number;
  shutterSpeed?: string; focalLength?: number; flash?: string;
  gpsLat?: number; gpsLon?: number; gpsAltitude?: number; gpsTimestamp?: string;
  iptcTitle?: string; iptcCreator?: string; iptcCopyright?: string; iptcKeywords?: string[];
  iptcDescription?: string; iptcCity?: string; iptcCountry?: string;
  xmpCreator?: string; xmpRights?: string; xmpDescription?: string; xmpSubject?: string[];
  xmpRating?: number; xmpLabel?: string; xmpHistoryActions?: string[];
  software?: string; editingChain?: string[]; embeddedCopyright?: string;
}
export interface MusicMetadata {
  title?: string; album?: string; artist?: string; albumArtist?: string; composer?: string;
  genre?: string; year?: number; trackNumber?: number; durationSeconds?: number;
  bpm?: number; key?: string; isrc?: string; publisher?: string; copyright?: string;
  comment?: string; lyrics?: string; coverArtDataUrl?: string;
  sampleRate?: number; bitrate?: number; channels?: number; codec?: string;
}
export interface AIMetadata {
  detected: boolean; platform?: string; model?: string; modelVersion?: string;
  generationTimestamp?: string; prompt?: string; negativePrompt?: string;
  seed?: string; cfg?: number; style?: string; lora?: string[];
  voiceModel?: string; persona?: string; workflow?: string;
  generationSettings?: Record<string, unknown>; rawAIComment?: string;
}
export interface ProvenanceMapping {
  creationEvent: { timestamp?: string; location?: string; device?: string; software?: string; };
  aiParticipation: { involved: boolean; platform?: string; model?: string; role?: string; prompt?: string; seed?: string; };
  revisionChain: { editingHistory?: string[]; versionIndicators?: string[]; };
  embeddedAttribution: { creator?: string; copyright?: string; rights?: string; publisher?: string; };
}
export interface UploadMetadataV2 {
  file: FileMetadata; image?: ImageMetadata; music?: MusicMetadata;
  ai: AIMetadata; provenance: ProvenanceMapping;
  fileHash: string; fileSizeBytes: number; mimeType: string; fileName: string;
  durationSeconds?: number; sampleRate?: number; bitDepth?: number;
  pageCount?: number; previewDataUrl?: string;
}

export async function md5Hex(buffer: ArrayBuffer): Promise<string> {
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
    return Array.from(new Uint8Array(hashBuffer).slice(0, 16)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch { return ""; }
}

const AI_SIGNATURES: Record<string, RegExp[]> = {
  suno: [/suno/i, /chirp/i], udio: [/udio/i],
  midjourney: [/midjourney/i, /--v \d/i, /--ar \d/i, /--stylize/i],
  stable_diffusion: [/stable.diffusion/i, /automatic1111/i, /comfyui/i, /CFG scale/i, /Sampler:/i, /Steps:/i],
  flux: [/flux/i, /black.?forest.?labs/i], chatgpt: [/chatgpt/i, /dall.?e/i],
  claude: [/claude/i, /anthropic/i], gemini: [/gemini/i, /imagen/i],
  runway: [/runway/i, /gen-\d/i], elevenlabs: [/elevenlabs/i],
  adobe_firefly: [/firefly/i, /adobe.?ai/i], leonardo: [/leonardo/i],
};

function detectAIPlatform(text: string): string | undefined {
  for (const [platform, patterns] of Object.entries(AI_SIGNATURES)) {
    if (patterns.some(p => p.test(text))) return platform;
  }
  return undefined;
}

function parseSDMetadata(comment: string): Partial<AIMetadata> {
  const r: Partial<AIMetadata> = { platform: "stable_diffusion", detected: true, rawAIComment: comment };
  const pm = comment.match(/^([\s\S]+?)(?:\nNegative prompt:|Steps:|$)/);
  if (pm) r.prompt = pm[1].trim();
  const nm = comment.match(/Negative prompt:\s*([\s\S]+?)(?:\nSteps:|$)/);
  if (nm) r.negativePrompt = nm[1].trim();
  const cfgm = comment.match(/CFG scale:\s*([\d.]+)/);
  if (cfgm) r.cfg = parseFloat(cfgm[1]);
  const seedm = comment.match(/Seed:\s*(\d+)/);
  if (seedm) r.seed = seedm[1];
  const modelm = comment.match(/Model:\s*([^,\n]+)/);
  if (modelm) r.model = modelm[1].trim();
  const loram = comment.match(/<lora:([^>]+)>/g);
  if (loram) r.lora = loram.map(l => l.replace(/<lora:|>/g, ""));
  return r;
}

function extractAIMetadata(tags: Record<string, unknown>): AIMetadata {
  const base: AIMetadata = { detected: false };
  const textFields = [tags?.UserComment, tags?.ImageDescription, tags?.Comment, tags?.Software]
    .filter(Boolean).map(String);
  const allText = textFields.join(" ");
  if (!allText.trim()) return base;
  const platform = detectAIPlatform(allText);
  if (!platform) return base;
  base.detected = true; base.platform = platform;
  const commentField = String(tags?.UserComment ?? tags?.ImageDescription ?? tags?.Comment ?? "");
  if (platform === "stable_diffusion" && commentField) return { ...base, ...parseSDMetadata(commentField) };
  if (commentField) base.rawAIComment = commentField;
  return base;
}

async function extractImageMetadataV2(file: File): Promise<{ image: ImageMetadata; ai: AIMetadata }> {
  const image: ImageMetadata = {};
  let ai: AIMetadata = { detected: false };
  try {
    const exifr = await import("exifr");
    const tags = await exifr.parse(file, { tiff: true, exif: true, gps: true, iptc: true, xmp: true, translateKeys: true, translateValues: true, reviveValues: true }).catch(() => null);
    if (!tags) return { image, ai };
    image.width = tags.ImageWidth ?? tags.ExifImageWidth ?? tags.PixelXDimension;
    image.height = tags.ImageHeight ?? tags.ExifImageHeight ?? tags.PixelYDimension;
    if (image.width && image.height) image.resolution = `${image.width}×${image.height}`;
    image.colorProfile = tags.ColorSpace ?? tags.ProfileDescription;
    image.orientation = tags.Orientation;
    image.cameraMake = tags.Make; image.cameraModel = tags.Model;
    image.lens = tags.LensModel ?? tags.Lens;
    image.iso = tags.ISO ?? tags.ISOSpeedRatings;
    image.aperture = tags.FNumber ?? tags.ApertureValue;
    if (tags.ExposureTime) { const et = tags.ExposureTime as number; image.shutterSpeed = et < 1 ? `1/${Math.round(1/et)}s` : `${et}s`; }
    image.focalLength = tags.FocalLength;
    if (tags.latitude !== undefined) image.gpsLat = tags.latitude as number;
    if (tags.longitude !== undefined) image.gpsLon = tags.longitude as number;
    image.gpsAltitude = tags.GPSAltitude as number;
    image.iptcTitle = tags.ObjectName ?? tags.Headline;
    image.iptcCreator = Array.isArray(tags.Creator) ? (tags.Creator as string[]).join(", ") : tags.Creator as string;
    image.iptcCopyright = tags.CopyrightNotice ?? tags.Copyright;
    image.iptcKeywords = Array.isArray(tags.Keywords) ? tags.Keywords as string[] : tags.Keywords ? [tags.Keywords as string] : undefined;
    image.iptcDescription = tags.Caption ?? tags.Description;
    image.iptcCity = tags.City; image.iptcCountry = tags.Country;
    image.xmpCreator = tags["dc:creator"] ?? tags.creator;
    image.xmpRights = tags["dc:rights"] ?? tags.rights;
    image.xmpDescription = tags["dc:description"] ?? tags.description;
    image.xmpRating = tags.Rating as number;
    image.software = tags.Software ?? tags.ProcessingSoftware;
    if (image.software) image.editingChain = [String(image.software)];
    image.embeddedCopyright = tags.Copyright ?? tags.CopyrightNotice;
    ai = extractAIMetadata(tags as Record<string, unknown>);
  } catch { /* exifr not available */ }
  return { image, ai };
}

async function extractMusicMetadataV2(file: File): Promise<{ music: MusicMetadata; ai: AIMetadata }> {
  const music: MusicMetadata = {};
  let ai: AIMetadata = { detected: false };
  try {
    const mmb = await import("music-metadata-browser");
    const { common, format } = await mmb.parseBlob(file, { duration: true });
    music.title = common.title; music.album = common.album;
    music.artist = common.artist ?? (common.artists ? common.artists.join(", ") : undefined);
    music.albumArtist = common.albumartist;
    music.composer = Array.isArray(common.composer) ? common.composer.join(", ") : common.composer;
    music.genre = Array.isArray(common.genre) ? common.genre[0] : common.genre;
    music.year = common.year; music.trackNumber = common.track?.no ?? undefined;
    music.durationSeconds = format.duration; music.bpm = common.bpm; music.key = common.key;
    music.isrc = Array.isArray(common.isrc) ? common.isrc[0] : common.isrc;
    music.publisher = Array.isArray(common.label) ? common.label.join(", ") : common.label;
    music.copyright = common.copyright;
    music.comment = Array.isArray(common.comment) ? common.comment.map((c: any) => c.text ?? c).join("; ") : common.comment;
    music.lyrics = Array.isArray(common.lyrics) ? common.lyrics.map((l: any) => l.text ?? l).join("\n") : common.lyrics;
    music.sampleRate = format.sampleRate; music.bitrate = format.bitrate;
    music.channels = format.numberOfChannels; music.codec = format.codec;
    if (common.picture?.length) {
      const pic = common.picture[0];
      const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
      music.coverArtDataUrl = await new Promise<string>(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(blob); });
    }
    const commentText = music.comment ?? "";
    const platform = detectAIPlatform(commentText);
    if (platform) ai = { detected: true, platform, rawAIComment: commentText };
  } catch { /* music-metadata-browser not available */ }
  return { music, ai };
}

function buildProvenanceMapping(file: File, image?: ImageMetadata, music?: MusicMetadata, ai?: AIMetadata): ProvenanceMapping {
  return {
    creationEvent: {
      timestamp: image?.gpsTimestamp ?? (file.lastModified ? new Date(file.lastModified).toISOString() : undefined),
      location: (image?.gpsLat && image?.gpsLon) ? `${image.gpsLat.toFixed(6)}, ${image.gpsLon.toFixed(6)}` : undefined,
      device: [image?.cameraMake, image?.cameraModel].filter(Boolean).join(" ") || undefined,
      software: image?.software,
    },
    aiParticipation: ai?.detected ? { involved: true, platform: ai.platform, model: ai.model, role: "generated", prompt: ai.prompt, seed: ai.seed } : { involved: false },
    revisionChain: { editingHistory: image?.editingChain, versionIndicators: image?.xmpHistoryActions },
    embeddedAttribution: {
      creator: image?.iptcCreator ?? image?.xmpCreator ?? music?.artist,
      copyright: image?.iptcCopyright ?? image?.embeddedCopyright ?? music?.copyright,
      rights: image?.xmpRights, publisher: music?.publisher,
    },
  };
}

export async function extractFileMetadata(file: File): Promise<UploadMetadataV2> {
  const buffer = await file.arrayBuffer();
  const [sha256, md5] = await Promise.all([sha256Hex(buffer), md5Hex(buffer)]);
  const fileMeta: FileMetadata = { fileName: file.name, fileType: file.type || "application/octet-stream", fileSizeBytes: file.size, sha256, md5, modifiedDate: file.lastModified ? new Date(file.lastModified).toISOString() : undefined };
  let imageMeta: ImageMetadata | undefined;
  let musicMeta: MusicMetadata | undefined;
  let aiMeta: AIMetadata = { detected: false };
  let durationSeconds: number | undefined;
  let sampleRate: number | undefined;
  let previewDataUrl: string | undefined;
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","tiff","heic","heif","avif","raw","cr2","nef","arw"].includes(ext)) {
    const r = await extractImageMetadataV2(file);
    imageMeta = r.image; aiMeta = r.ai;
    try { previewDataUrl = URL.createObjectURL(file); } catch { /* ignore */ }
  } else if (mime.startsWith("audio/") || ["mp3","flac","wav","ogg","aac","m4a","opus","aiff","wma"].includes(ext)) {
    const r = await extractMusicMetadataV2(file);
    musicMeta = r.music; aiMeta = r.ai;
    durationSeconds = musicMeta.durationSeconds; sampleRate = musicMeta.sampleRate;
    previewDataUrl = musicMeta.coverArtDataUrl;
  }
  if (!aiMeta.detected) { const p = detectAIPlatform(file.name); if (p) aiMeta = { detected: true, platform: p }; }
  const provenance = buildProvenanceMapping(file, imageMeta, musicMeta, aiMeta);
  return { file: fileMeta, image: imageMeta, music: musicMeta, ai: aiMeta, provenance, fileHash: sha256, fileSizeBytes: file.size, mimeType: file.type, fileName: file.name, durationSeconds, sampleRate, previewDataUrl };
}
