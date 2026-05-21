/**
 * Image Processing Pipeline — "Micronize"
 *
 * All visual uploads (avatars, banners, cover art, gallery) pass through this
 * module before hitting S3. The goal: trim dead space, center-crop where needed,
 * compress to WebP at perceptually-lossless quality, and output the smallest
 * possible file that still looks crisp on retina displays.
 *
 * No visual quality loss — just surgical optimization for mobile delivery.
 */

import sharp from "sharp";

// ── Configuration ────────────────────────────────────────────────────────────

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
}

interface ProcessOptions {
  /** Max width in pixels (height scales proportionally unless crop is set) */
  maxWidth: number;
  /** Max height in pixels (optional — if set with crop, forces exact dimensions) */
  maxHeight?: number;
  /** WebP quality 1-100 (higher = better quality, larger file) */
  quality: number;
  /** WebP compression effort 0-6 (higher = slower but smaller) */
  effort: number;
  /** Whether to center-crop to exact maxWidth×maxHeight (for avatars) */
  crop?: boolean;
  /** Whether to trim transparent/near-uniform borders before processing */
  trim?: boolean;
  /** Sharpen after resize for crispness (subtle unsharp mask) */
  sharpen?: boolean;
}

// ── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 82,
    effort: 4,
    crop: true,
    trim: true,
    sharpen: true,
  },
  banner: {
    maxWidth: 1600,
    maxHeight: 600,
    quality: 80,
    effort: 4,
    crop: false,
    trim: false,
    sharpen: true,
  },
  coverArt: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 85,
    effort: 4,
    crop: false,
    trim: true,
    sharpen: true,
  },
  gallery: {
    maxWidth: 1400,
    quality: 80,
    effort: 4,
    crop: false,
    trim: false,
    sharpen: true,
  },
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 70,
    effort: 5,
    crop: true,
    trim: false,
    sharpen: true,
  },
  sigil: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
    effort: 4,
    crop: false,
    trim: true,
    sharpen: true,
  },
} as const satisfies Record<string, ProcessOptions>;

export type ImagePreset = keyof typeof PRESETS;

// ── Core Processing Function ─────────────────────────────────────────────────

/**
 * Process an image buffer through the micronization pipeline.
 *
 * @param input - Raw image bytes (JPEG, PNG, WebP, AVIF, TIFF, GIF)
 * @param preset - Named preset or custom options
 * @returns Processed WebP buffer with metadata
 */
export async function processImage(
  input: Buffer | Uint8Array,
  preset: ImagePreset | ProcessOptions
): Promise<ProcessedImage> {
  const opts: ProcessOptions = typeof preset === "string" ? PRESETS[preset] : preset;
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const originalSize = inputBuffer.byteLength;

  let pipeline = sharp(inputBuffer, {
    // Rotate based on EXIF orientation, then strip metadata
    failOn: "truncated",
  }).rotate(); // Auto-rotate based on EXIF

  // Step 1: Trim dead space (transparent/near-uniform borders)
  if (opts.trim) {
    try {
      pipeline = pipeline.trim({ threshold: 10 });
    } catch {
      // trim() can fail on certain images — continue without trimming
    }
  }

  // Step 2: Resize / Crop
  if (opts.crop && opts.maxHeight) {
    // Center-crop to exact dimensions (avatars)
    pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    });
  } else if (opts.maxHeight) {
    // Fit within bounding box, maintain aspect ratio
    pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  } else {
    // Scale down to max width only
    pipeline = pipeline.resize(opts.maxWidth, undefined, {
      withoutEnlargement: true,
    });
  }

  // Step 3: Sharpen (subtle unsharp mask for crispness after downscale)
  if (opts.sharpen) {
    pipeline = pipeline.sharpen({
      sigma: 0.8,
      m1: 0.5, // flat areas
      m2: 1.5, // jagged areas (edges)
    });
  }

  // Step 4: Convert to WebP
  pipeline = pipeline.webp({
    quality: opts.quality,
    effort: opts.effort,
    smartSubsample: true,
    nearLossless: opts.quality >= 85, // near-lossless for high-quality presets
  });

  // Step 5: Strip all metadata (EXIF, ICC, XMP) for privacy + size
  pipeline = pipeline.withMetadata({ orientation: undefined });

  const outputBuffer = await pipeline.toBuffer();
  const metadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    mimeType: "image/webp",
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    originalSize,
    processedSize: outputBuffer.byteLength,
    compressionRatio: originalSize > 0 ? +(originalSize / outputBuffer.byteLength).toFixed(2) : 1,
  };
}

/**
 * Process an image and return just the buffer (convenience wrapper for upload flows).
 */
export async function micronize(
  input: Buffer | Uint8Array,
  preset: ImagePreset
): Promise<{ buffer: Buffer; mimeType: "image/webp" }> {
  const result = await processImage(input, preset);
  return { buffer: result.buffer, mimeType: result.mimeType };
}

/**
 * Check if a buffer is a valid image that sharp can process.
 */
export async function isValidImage(input: Buffer | Uint8Array): Promise<boolean> {
  try {
    const meta = await sharp(Buffer.isBuffer(input) ? input : Buffer.from(input)).metadata();
    return !!meta.width && !!meta.height;
  } catch {
    return false;
  }
}

export { PRESETS as IMAGE_PRESETS };
