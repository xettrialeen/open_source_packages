/**
 * Quality presets that developers can use instead of guessing numbers
 * These are based on practical experience with different use cases
 */
export const QUALITY_PRESETS = {
    LOW: 0.4,      // Heavily compressed, good for thumbnails
    MEDIUM: 0.7,   // Good balance of size and quality
    HIGH: 0.9,     // High quality, larger file size
    LOSSLESS: 1.0  // No compression, original quality
  };
  
  /**
   * Supported output formats
   * WebP gives the best compression but isn't supported everywhere yet
   */
  export const FORMAT_OPTIONS = {
    WEBP: 'webp',
    JPEG: 'jpeg', 
    JPG: 'jpg',   // Same as JPEG, just different extension
    PNG: 'png'
  };
  
  /**
   * Default options for compression
   * These work well for most use cases
   */
  const DEFAULT_OPTIONS = {
    quality: QUALITY_PRESETS.MEDIUM,
    format: FORMAT_OPTIONS.WEBP,
    maxWidth: null,
    maxHeight: null,
    enableLogging: false,
    logLevel: 'basic',  // 'basic' or 'detailed'
    preferredMethod: null  // Let the library choose automatically
  };
  
  /**
   * Validate and normalize the options object
   * This prevents common mistakes and sets sensible defaults
   */
  export function validateOptions(options = {}) {
    const validated = { ...DEFAULT_OPTIONS, ...options };
    
    // Make sure quality is between 0 and 1
    if (validated.quality < 0 || validated.quality > 1) {
      console.warn(`Quality must be between 0 and 1, got ${validated.quality}. Using default.`);
      validated.quality = DEFAULT_OPTIONS.quality;
    }
    
    // Check if the format is supported
    const supportedFormats = Object.values(FORMAT_OPTIONS);
    if (!supportedFormats.includes(validated.format.toLowerCase())) {
      console.warn(`Unsupported format: ${validated.format}. Using JPEG instead.`);
      validated.format = FORMAT_OPTIONS.JPEG;
    }
    
    // Normalize format to lowercase
    validated.format = validated.format.toLowerCase();
    
    // Validate log level
    if (!['basic', 'detailed'].includes(validated.logLevel)) {
      validated.logLevel = 'basic';
    }
    
    // Check max dimensions
    if (validated.maxWidth && validated.maxWidth <= 0) {
      console.warn('maxWidth must be positive. Ignoring.');
      validated.maxWidth = null;
    }
    
    if (validated.maxHeight && validated.maxHeight <= 0) {
      console.warn('maxHeight must be positive. Ignoring.');
      validated.maxHeight = null;
    }
    
    return validated;
  }
  
  /**
   * Create an Image element from various input types
   * This handles files, blobs, data URLs, etc.
   */
  export async function createImageFromInput(input) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (input instanceof File || input instanceof Blob) {
        const url = URL.createObjectURL(input);
        img.onload = () => {
          URL.revokeObjectURL(url);  // Clean up memory
          resolve(img);
        };
        img.src = url;
      } else if (typeof input === 'string') {
        img.src = input;
      } else if (input instanceof HTMLImageElement) {
        // If it's already an image, just return it
        resolve(input);
      } else {
        reject(new Error('Unsupported input type'));
      }
    });
  }
  
  /**
   * Calculate compression statistics
   * This gives users useful feedback about how much space they saved
   */
  export function calculateStats(originalSize, compressedSize, format) {
    const savedBytes = originalSize - compressedSize;
    const compressionRatio = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;
    
    return {
      originalSize,
      compressedSize,
      savedBytes,
      compressionRatio,
      format: format.toUpperCase()
    };
  }
  
  /**
   * Format byte sizes in a human-readable way
   * Nobody wants to read "2048576 bytes" when they could read "2.0 MB"
   */
  export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  /**
   * Generate a unique filename for compressed images
   * Tries to preserve the original name when possible
   */
  export function generateUniqueFilename(originalName, format, suffix = 'compressed') {
    const timestamp = Date.now();
    
    if (originalName) {
      // Remove the original extension and add our own
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      return `${baseName}-${suffix}-${timestamp}.${format}`;
    } else {
      return `image-${suffix}-${timestamp}.${format}`;
    }
  }
  
  /**
   * Check if the current environment supports a specific image format
   */
  export function supportsFormat(format) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.5);
      return dataUrl.indexOf(`data:image/${format}`) === 0;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Estimate the final file size before compression
   * This is just a rough estimate but can be useful for progress indicators
   */
  export function estimateCompressedSize(originalSize, quality, format) {
    // These are rough estimates based on typical compression ratios
    const compressionRatios = {
      'webp': 0.25,   // WebP is very efficient
      'jpeg': 0.35,   // JPEG is pretty good
      'jpg': 0.35,    // Same as JPEG
      'png': 0.8      // PNG doesn't compress as much
    };
    
    const baseRatio = compressionRatios[format.toLowerCase()] || 0.5;
    
    // Adjust based on quality setting
    const qualityMultiplier = 0.3 + (quality * 0.7);  // Range from 0.3 to 1.0
    
    return Math.round(originalSize * baseRatio * qualityMultiplier);
  }


  /**
 * Resize a canvas while maintaining aspect ratio
 * This is a utility function for canvas-based operations
 */
export function resizeCanvas(canvas, maxWidth, maxHeight) {
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  
  if (!maxWidth && !maxHeight) {
    return; // No resizing needed
  }
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Calculate new dimensions while maintaining aspect ratio
  if (maxWidth && newWidth > maxWidth) {
    const ratio = maxWidth / newWidth;
    newWidth = maxWidth;
    newHeight = Math.round(newHeight * ratio);
  }
  
  if (maxHeight && newHeight > maxHeight) {
    const ratio = maxHeight / newHeight;
    newHeight = maxHeight;
    newWidth = Math.round(newWidth * ratio);
  }
  
  // Only resize if dimensions actually changed
  if (newWidth !== originalWidth || newHeight !== originalHeight) {
    // Get the current image data
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
    
    // Resize the canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Redraw the image at the new size
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = originalWidth;
    tempCanvas.height = originalHeight;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Draw the temp canvas onto the resized canvas
    ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, newWidth, newHeight);
  }
}