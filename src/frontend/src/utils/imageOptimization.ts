/**
 * Client-side image optimization utility
 * Downscales and compresses images before upload to reduce payload size
 */

export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  mimeType?: string;
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

// Presets for different use cases
export const IMAGE_PRESETS = {
  POST: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    mimeType: "image/jpeg",
  },
  AVATAR: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.9,
    mimeType: "image/jpeg",
  },
} as const;

/**
 * Validates if a file is a valid image
 */
export function validateImage(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  return validTypes.includes(file.type);
}

/**
 * Optimizes an image file by downscaling and compressing
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions,
): Promise<OptimizationResult> {
  const originalSize = file.size;

  // Validate image type
  if (!validateImage(file)) {
    throw new Error("Invalid image type. Please use JPEG, PNG, WebP, or GIF.");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > options.maxWidth) {
        width = options.maxWidth;
        height = width / aspectRatio;
      }

      if (height > options.maxHeight) {
        height = options.maxHeight;
        width = height * aspectRatio;
      }

      // Set canvas dimensions
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      // Draw and compress image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          const optimizedSize = blob.size;
          const compressionRatio =
            ((originalSize - optimizedSize) / originalSize) * 100;

          // Create new file from blob
          const optimizedFile = new File([blob], file.name, {
            type: options.mimeType || file.type,
            lastModified: Date.now(),
          });

          resolve({
            file: optimizedFile,
            originalSize,
            optimizedSize,
            compressionRatio,
          });
        },
        options.mimeType || file.type,
        options.quality,
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes an image for post upload
 */
export async function optimizePostImage(
  file: File,
): Promise<OptimizationResult> {
  return optimizeImage(file, IMAGE_PRESETS.POST);
}

/**
 * Optimizes an image for avatar/profile picture upload
 */
export async function optimizeAvatarImage(
  file: File,
): Promise<OptimizationResult> {
  return optimizeImage(file, IMAGE_PRESETS.AVATAR);
}
