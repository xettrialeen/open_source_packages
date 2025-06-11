import { createImageFromInput } from '../utils/helpers.js';

/**
 * Canvas-based compression - this is the fastest method when it works
 * But CSP policies can block it, so we need to handle that gracefully
 */
export class CanvasHandler {
  constructor() {
    this.name = 'canvas';
  }
  
  async compress(input, options) {
    try {
      // First, get the image into a format we can work with
      const img = await createImageFromInput(input);
      
      // Create a canvas and draw the image onto it
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set the canvas size - either original or resized
      const { width, height } = this.calculateDimensions(img, options);
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image onto the canvas
      // This is where the actual resizing happens if needed
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert the canvas to a blob with the specified quality and format
      const blob = await this.canvasToBlob(canvas, options);
      
      // Create a File object for easier handling
      const filename = this.generateFilename(input, options.format);
      const file = new File([blob], filename, { type: blob.type });
      
      return {
        blob: blob,
        file: file,
        size: blob.size
      };
      
    } catch (error) {
      throw new Error(`Canvas compression failed: ${error.message}`);
    }
  }
  
  /**
   * Figure out what size the output image should be
   * Respects maxWidth and maxHeight while keeping aspect ratio
   */
  calculateDimensions(img, options) {
    let { width, height } = {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height
    };
    
    // If no size limits are set, use original size
    if (!options.maxWidth && !options.maxHeight) {
      return { width, height };
    }
    
    // Calculate the scaling factor to fit within the limits
    let scale = 1;
    
    if (options.maxWidth && width > options.maxWidth) {
      scale = Math.min(scale, options.maxWidth / width);
    }
    
    if (options.maxHeight && height > options.maxHeight) {
      scale = Math.min(scale, options.maxHeight / height);
    }
    
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale)
    };
  }
  
  /**
   * Convert canvas to blob with the right format and quality
   * This is where the actual compression magic happens
   */
  canvasToBlob(canvas, options) {
    return new Promise((resolve, reject) => {
      const mimeType = this.getMimeType(options.format);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, mimeType, options.quality);
    });
  }
  
  /**
   * Convert our format names to proper MIME types
   */
  getMimeType(format) {
    const mimeTypes = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    };
    
    return mimeTypes[format.toLowerCase()] || 'image/jpeg';
  }
  
  /**
   * Generate a filename for the compressed image
   * Tries to keep the original name but changes the extension
   */
  generateFilename(input, format) {
    let baseName = 'compressed-image';
    
    if (input instanceof File) {
      // Remove the old extension and use the base name
      baseName = input.name.replace(/\.[^/.]+$/, '');
    }
    
    return `${baseName}.${format}`;
  }
}