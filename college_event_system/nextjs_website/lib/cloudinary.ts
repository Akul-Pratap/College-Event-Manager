/**
 * lib/cloudinary.ts — Cloudinary client utilities for LTSU Events Next.js app
 * Handles: image upload (server-side), signed URL generation, image transformation
 *
 * IMPORTANT: All Cloudinary API Secret operations must run server-side only.
 * Never expose CLOUDINARY_API_SECRET to the browser.
 */

import { v2 as cloudinary } from "cloudinary";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;

// Upload presets (configured in Cloudinary dashboard)
export const UPLOAD_PRESETS = {
  payments: "ltsu_payments",      // signed, jpg/png only, 5 MB max
  gallery: "ltsu_gallery",        // signed, jpg/png/webp
  logos: "ltsu_logos",            // signed, jpg/png/webp, 2 MB max
  avatars: "ltsu_avatars",        // signed, jpg/png, 1 MB max
} as const;

export type UploadPreset = keyof typeof UPLOAD_PRESETS;

// ─────────────────────────────────────────────────────────────────────────────
// Upload Helpers  (server-side only)
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResult {
  success: boolean;
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: string;
}

/**
 * Upload a file (Buffer or base64 data URI) to Cloudinary.
 *
 * @param source    Buffer, base64 string, or remote URL to upload.
 * @param folder    Cloudinary folder path (e.g. "ltsu/payments").
 * @param preset    Upload preset name from UPLOAD_PRESETS.
 * @param publicId  Optional custom public_id. Auto-generated if omitted.
 *
 * @example
 *   const result = await uploadToCloudinary(buffer, "ltsu/gallery", "gallery");
 */
export async function uploadToCloudinary(
  source: Buffer | string,
  folder: string,
  preset: UploadPreset,
  publicId?: string
): Promise<UploadResult> {
  try {
    // Convert Buffer to base64 data URI if needed
    const uploadSource =
      Buffer.isBuffer(source)
        ? `data:image/jpeg;base64,${source.toString("base64")}`
        : source;

    const options: Record<string, unknown> = {
      folder,
      upload_preset: UPLOAD_PRESETS[preset],
      resource_type: "image",
      type: "private",         // requires signed URL to access
      overwrite: false,
      unique_filename: true,
    };

    if (publicId) {
      options.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(uploadSource, options);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cloudinary upload failed";
    console.error("[Cloudinary] Upload error:", message);
    return { success: false, url: "", publicId: "", error: message };
  }
}

/**
 * Upload a payment screenshot to the ltsu/payments folder.
 * Uses the "ltsu_payments" upload preset (signed, image files only).
 */
export async function uploadPaymentScreenshot(
  source: Buffer | string,
  registrationId: string
): Promise<UploadResult> {
  const publicId = `payment_${registrationId}_${Date.now()}`;
  return uploadToCloudinary(source, "ltsu/payments", "payments", publicId);
}

/**
 * Upload a gallery image for an event.
 */
export async function uploadGalleryImage(
  source: Buffer | string,
  eventId: string
): Promise<UploadResult> {
  const publicId = `gallery_${eventId}_${Date.now()}`;
  return uploadToCloudinary(source, `ltsu/gallery/${eventId}`, "gallery", publicId);
}

/**
 * Upload a club logo.
 */
export async function uploadClubLogo(
  source: Buffer | string,
  clubId: string
): Promise<UploadResult> {
  const publicId = `logo_${clubId}`;
  return uploadToCloudinary(source, "ltsu/logos", "logos", publicId);
}

/**
 * Delete an image from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: "private",
    });
    return result.result === "ok";
  } catch (err) {
    console.error("[Cloudinary] Delete error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed URL Generator  (server-side only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a signed (temporary) URL for a private Cloudinary image.
 * The URL expires after `expiresInSeconds` (default: 1 hour).
 *
 * Use this when serving payment screenshots or other private images to
 * authorized users — never expose the raw Cloudinary URL directly.
 */
export function generateSignedUrl(
  publicId: string,
  expiresInSeconds = 3600
): string {
  const expireAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    sign_url: true,
    type: "private",
    expires_at: expireAt,
    secure: true,
  });
}

/**
 * Generate a signed URL with transformation options.
 *
 * @example
 *   generateSignedTransformedUrl("ltsu/gallery/img123", {
 *     width: 800, height: 600, crop: "fill", quality: "auto"
 *   })
 */
export function generateSignedTransformedUrl(
  publicId: string,
  transformation: Record<string, unknown>,
  expiresInSeconds = 3600
): string {
  const expireAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    sign_url: true,
    type: "private",
    expires_at: expireAt,
    secure: true,
    ...transformation,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public URL Builders  (client-safe — no secrets)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a public (non-signed) Cloudinary URL with optional transformations.
 * Use only for public/upload type images (logos, event banners, etc.).
 *
 * @example
 *   getPublicUrl("ltsu/logos/logo_abc", { width: 200, height: 200, crop: "fill" })
 */
export function getPublicUrl(
  publicId: string,
  transformation?: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "scale" | "thumb" | "pad";
    quality?: "auto" | "auto:good" | "auto:eco" | number;
    format?: "auto" | "webp" | "jpg" | "png";
    gravity?: string;
    radius?: number | "max";
  }
): string {
  if (!CLOUD_NAME) return "";

  const baseUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

  if (!transformation) {
    return `${baseUrl}/${publicId}`;
  }

  const parts: string[] = [];

  if (transformation.width)   parts.push(`w_${transformation.width}`);
  if (transformation.height)  parts.push(`h_${transformation.height}`);
  if (transformation.crop)    parts.push(`c_${transformation.crop}`);
  if (transformation.quality) parts.push(`q_${transformation.quality}`);
  if (transformation.format)  parts.push(`f_${transformation.format}`);
  if (transformation.gravity) parts.push(`g_${transformation.gravity}`);
  if (transformation.radius)  parts.push(`r_${transformation.radius}`);

  const transform = parts.join(",");
  return transform
    ? `${baseUrl}/${transform}/${publicId}`
    : `${baseUrl}/${publicId}`;
}

/**
 * Get a thumbnail URL for a Cloudinary image.
 * Suitable for event cards, gallery grids, and avatar images.
 *
 * @param publicId   Cloudinary public_id.
 * @param size       Square thumbnail size in pixels (default: 300).
 */
export function getThumbnailUrl(publicId: string, size = 300): string {
  return getPublicUrl(publicId, {
    width: size,
    height: size,
    crop: "fill",
    quality: "auto",
    format: "auto",
    gravity: "auto",
  });
}

/**
 * Get an optimized banner/hero image URL.
 *
 * @param publicId  Cloudinary public_id.
 * @param width     Banner width in pixels (default: 1200).
 * @param height    Banner height in pixels (default: 630).
 */
export function getBannerUrl(
  publicId: string,
  width = 1200,
  height = 630
): string {
  return getPublicUrl(publicId, {
    width,
    height,
    crop: "fill",
    quality: "auto",
    format: "auto",
    gravity: "auto",
  });
}

/**
 * Get a small avatar/profile image URL.
 *
 * @param publicId  Cloudinary public_id.
 * @param size      Avatar size in pixels (default: 64).
 */
export function getAvatarUrl(publicId: string, size = 64): string {
  return getPublicUrl(publicId, {
    width: size,
    height: size,
    crop: "fill",
    quality: "auto:good",
    format: "auto",
    gravity: "face",
    radius: "max",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Signature Generator  (for direct browser uploads)
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  uploadPreset: string;
}

/**
 * Generate a signed upload signature for direct browser-to-Cloudinary uploads.
 * Call this from a Server Action or API Route — never from client code.
 *
 * The browser uses this signature to upload directly to Cloudinary
 * without routing the file through your server, saving bandwidth.
 *
 * @example (Server Action):
 *   const sig = await generateUploadSignature("ltsu/gallery", "gallery");
 *   // Pass sig to the client component
 */
export function generateUploadSignature(
  folder: string,
  preset: UploadPreset
): UploadSignature {
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadPreset = UPLOAD_PRESETS[preset];

  const paramsToSign = {
    folder,
    timestamp,
    upload_preset: uploadPreset,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder,
    uploadPreset,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File Validation Helpers  (client-safe)
// ─────────────────────────────────────────────────────────────────────────────

export const IMAGE_CONSTRAINTS = {
  maxSizeMB: 5,
  maxSizeBytes: 5 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"] as const,
};

/**
 * Validate an image File object before uploading.
 * Use in the browser before showing a preview or calling the upload API.
 *
 * @returns { valid: true } or { valid: false, error: string }
 */
export function validateImageFile(
  file: File
): { valid: true } | { valid: false; error: string } {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!IMAGE_CONSTRAINTS.allowedExtensions.includes(extension as never)) {
    return {
      valid: false,
      error: `Invalid file type. Please upload a JPG, PNG, or WebP image.`,
    };
  }

  if (!IMAGE_CONSTRAINTS.allowedTypes.includes(file.type as never)) {
    return {
      valid: false,
      error: `Invalid MIME type: ${file.type}. Please upload a valid image.`,
    };
  }

  if (file.size > IMAGE_CONSTRAINTS.maxSizeBytes) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB} MB). Maximum allowed size is ${IMAGE_CONSTRAINTS.maxSizeMB} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Convert a File to a base64 data URI string.
 * Useful for creating local previews before upload.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default cloudinary;
