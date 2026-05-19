import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processImage, micronize, isValidImage, IMAGE_PRESETS } from "./imageProcessing";

/**
 * Generate a test image buffer of the given dimensions and format.
 */
async function createTestImage(
  width: number,
  height: number,
  format: "png" | "jpeg" = "png"
): Promise<Buffer> {
  const pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  });
  if (format === "png") return pipeline.png().toBuffer();
  return pipeline.jpeg({ quality: 90 }).toBuffer();
}

describe("imageProcessing", () => {
  describe("processImage", () => {
    it("should process an image with the avatar preset (center-crop to 400x400)", async () => {
      const input = await createTestImage(1000, 800);
      const result = await processImage(input, "avatar");

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
      expect(result.processedSize).toBeLessThan(result.originalSize);
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    it("should process an image with the banner preset (max 1600x600)", async () => {
      const input = await createTestImage(3200, 1200);
      const result = await processImage(input, "banner");

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBeLessThanOrEqual(1600);
      expect(result.height).toBeLessThanOrEqual(600);
      expect(result.processedSize).toBeLessThan(result.originalSize);
    });

    it("should process an image with the coverArt preset (max 1200x1200)", async () => {
      const input = await createTestImage(2400, 2400);
      const result = await processImage(input, "coverArt");

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBeLessThanOrEqual(1200);
      expect(result.height).toBeLessThanOrEqual(1200);
      expect(result.processedSize).toBeLessThan(result.originalSize);
    });

    it("should process an image with the gallery preset (max 1400 wide)", async () => {
      const input = await createTestImage(2800, 1800);
      const result = await processImage(input, "gallery");

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBeLessThanOrEqual(1400);
      expect(result.processedSize).toBeLessThan(result.originalSize);
    });

    it("should process an image with the thumbnail preset (200x200 crop)", async () => {
      const input = await createTestImage(800, 600);
      const result = await processImage(input, "thumbnail");

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });

    it("should not enlarge small images (withoutEnlargement)", async () => {
      const input = await createTestImage(200, 200);
      const result = await processImage(input, "coverArt");

      expect(result.mimeType).toBe("image/webp");
      // Should not be enlarged beyond original 200x200
      expect(result.width).toBeLessThanOrEqual(200);
      expect(result.height).toBeLessThanOrEqual(200);
    });

    it("should handle JPEG input", async () => {
      const input = await createTestImage(1000, 1000, "jpeg");
      const result = await processImage(input, "avatar");

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
    });

    it("should accept custom options", async () => {
      const input = await createTestImage(800, 600);
      const result = await processImage(input, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 60,
        effort: 3,
        crop: true,
        trim: false,
        sharpen: false,
      });

      expect(result.mimeType).toBe("image/webp");
      expect(result.width).toBe(300);
      expect(result.height).toBe(300);
    });
  });

  describe("micronize", () => {
    it("should return buffer and mimeType", async () => {
      const input = await createTestImage(500, 500);
      const result = await micronize(input, "avatar");

      expect(result.mimeType).toBe("image/webp");
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe("isValidImage", () => {
    it("should return true for valid images", async () => {
      const input = await createTestImage(100, 100);
      expect(await isValidImage(input)).toBe(true);
    });

    it("should return false for non-image data", async () => {
      const garbage = Buffer.from("this is not an image at all");
      expect(await isValidImage(garbage)).toBe(false);
    });
  });

  describe("IMAGE_PRESETS", () => {
    it("should have all expected presets defined", () => {
      expect(IMAGE_PRESETS).toHaveProperty("avatar");
      expect(IMAGE_PRESETS).toHaveProperty("banner");
      expect(IMAGE_PRESETS).toHaveProperty("coverArt");
      expect(IMAGE_PRESETS).toHaveProperty("gallery");
      expect(IMAGE_PRESETS).toHaveProperty("thumbnail");
    });

    it("avatar preset should crop to 400x400", () => {
      expect(IMAGE_PRESETS.avatar.maxWidth).toBe(400);
      expect(IMAGE_PRESETS.avatar.maxHeight).toBe(400);
      expect(IMAGE_PRESETS.avatar.crop).toBe(true);
    });

    it("banner preset should have max 1600x600", () => {
      expect(IMAGE_PRESETS.banner.maxWidth).toBe(1600);
      expect(IMAGE_PRESETS.banner.maxHeight).toBe(600);
      expect(IMAGE_PRESETS.banner.crop).toBe(false);
    });

    it("coverArt preset should have max 1200x1200", () => {
      expect(IMAGE_PRESETS.coverArt.maxWidth).toBe(1200);
      expect(IMAGE_PRESETS.coverArt.maxHeight).toBe(1200);
    });
  });
});
