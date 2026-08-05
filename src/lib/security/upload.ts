import sharp from "sharp";

/**
 * Upload validation & normalisation.
 *
 * Defence in depth for user-supplied images:
 *   - verify the *actual* bytes are a supported image (magic-byte sniff),
 *     not just a trusted extension / mime string;
 *   - enforce size, dimension and total-pixel limits (blocks tiny junk and
 *     decompression-bomb images);
 *   - re-encode through sharp, which strips EXIF/metadata and neutralises any
 *     exploit payload hidden in the original container.
 */

export interface UploadLimits {
  maxBytes: number;
  minDimension: number;
  maxDimension: number;
  maxPixels: number;
}

export const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxBytes: 12 * 1024 * 1024, // 12 MB
  minDimension: 200,
  maxDimension: 8000,
  maxPixels: 40_000_000, // ~40 MP
};

export type SniffedType = "jpeg" | "png" | "webp";

/** Detect a supported image type from magic bytes. Returns null if unknown. */
export function sniffImageType(buf: Buffer): SniffedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && // R
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x46 && // F
    buf[8] === 0x57 && // W
    buf[9] === 0x45 && // E
    buf[10] === 0x42 && // B
    buf[11] === 0x50 // P
  ) {
    return "webp";
  }
  return null;
}

export interface ValidatedImage {
  data: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  sourceFormat: SniffedType;
}

export type ValidationResult =
  | { ok: true; image: ValidatedImage }
  | { ok: false; error: string };

export async function validateAndNormalizeUpload(
  input: Buffer,
  limits: UploadLimits = DEFAULT_UPLOAD_LIMITS,
): Promise<ValidationResult> {
  if (input.length === 0) {
    return { ok: false, error: "The file is empty." };
  }
  if (input.length > limits.maxBytes) {
    const mb = Math.floor(limits.maxBytes / (1024 * 1024));
    return { ok: false, error: `File is too large (max ${mb} MB).` };
  }

  const sourceFormat = sniffImageType(input);
  if (!sourceFormat) {
    return { ok: false, error: "Unsupported file — please upload a JPEG, PNG or WebP image." };
  }

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(input, { limitInputPixels: limits.maxPixels }).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    return { ok: false, error: "That file could not be read as an image." };
  }

  if (width < limits.minDimension || height < limits.minDimension) {
    return { ok: false, error: `Image is too small (minimum ${limits.minDimension}px on each side).` };
  }
  if (width > limits.maxDimension || height > limits.maxDimension) {
    return { ok: false, error: `Image is too large (maximum ${limits.maxDimension}px on each side).` };
  }
  if (width * height > limits.maxPixels) {
    return { ok: false, error: "Image has too many pixels." };
  }

  let normalized: Buffer;
  let outWidth = width;
  let outHeight = height;
  try {
    const result = await sharp(input, { limitInputPixels: limits.maxPixels })
      .rotate() // bake in EXIF orientation, then drop metadata
      .jpeg({ quality: 92 })
      .toBuffer({ resolveWithObject: true });
    normalized = result.data;
    outWidth = result.info.width;
    outHeight = result.info.height;
  } catch {
    return { ok: false, error: "The image could not be processed. Try a different photo." };
  }

  return {
    ok: true,
    image: {
      data: normalized,
      mimeType: "image/jpeg",
      width: outWidth,
      height: outHeight,
      sourceFormat,
    },
  };
}
