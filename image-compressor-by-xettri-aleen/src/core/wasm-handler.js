/**
 * Modern WASM-based compression using browser-image-compression
 * This library is actively maintained and works with all modern Node versions
 */
export class WasmHandler {
  constructor() {
    this.name = 'wasm';
    this.isInitialized = false;
  }
  
  async compress(input, options) {
    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Convert input to File/Blob format that the library expects
      const file = await this.prepareInput(input);
      
      // Configure compression options
      const compressionOptions = this.buildCompressionOptions(options);
      
      // Do the actual compression
      const compressedFile = await this.imageCompression(file, compressionOptions);
      
      // Generate filename
      const filename = this.generateFilename(input, options.format);
      const finalFile = new File([compressedFile], filename, { type: compressedFile.type });
      
      return {
        blob: compressedFile,
        file: finalFile,
        size: compressedFile.size
      };
      
    } catch (error) {
      throw new Error(`WASM compression failed: ${error.message}`);
    }
  }
  
  /**
   * Initialize the compression library
   * We use dynamic import to avoid bundling issues
   */
  async initialize() {
    try {
      const module = await import('browser-image-compression');
      this.imageCompression = module.default;
      this.isInitialized = true;
    } catch (error) {
      throw new Error('Failed to load image compression library. Make sure browser-image-compression is installed.');
    }
  }
  
  /**
   * Convert various input types to File objects
   * The browser-image-compression library works best with File objects
   */
  async prepareInput(input) {
    if (input instanceof File) {
      return input;
    } else if (input instanceof Blob) {
      return new File([input], 'image.jpg', { type: input.type });
    } else if (typeof input === 'string') {
      // Handle data URLs
      const response = await fetch(input);
      const blob = await response.blob();
      return new File([blob], 'image.jpg', { type: blob.type });
    } else if (input instanceof HTMLImageElement) {
      // Convert image element to blob first
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = input.naturalWidth;
      canvas.height = input.naturalHeight;
      ctx.drawImage(input, 0, 0);
      
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      return new File([blob], 'image.png', { type: 'image/png' });
    }
    
    throw new Error('Unsupported input type for WASM compression');
  }
  
  /**
   * Build compression options for the browser-image-compression library
   * This library has slightly different option names than our API
   */
  buildCompressionOptions(options) {
    const compressionOptions = {
      maxSizeMB: 10, // Maximum size in MB (we'll calculate this based on quality)
      useWebWorker: true, // Use web worker for better performance
      preserveExif: false, // Remove EXIF data to save space
    };
    
    // Set quality (browser-image-compression uses 0-1 scale like us)
    if (options.quality !== undefined) {
      compressionOptions.initialQuality = options.quality;
    }
    
    // Set maximum dimensions
    if (options.maxWidth) {
      compressionOptions.maxWidthOrHeight = Math.max(options.maxWidth, options.maxHeight || 0);
    } else if (options.maxHeight) {
      compressionOptions.maxWidthOrHeight = options.maxHeight;
    }
    
    // Set output format
    if (options.format && options.format !== 'jpg') {
      compressionOptions.fileType = this.getMimeType(options.format);
    }
    
    return compressionOptions;
  }
  
  /**
   * Convert our format names to MIME types
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
  
  generateFilename(input, format) {
    let baseName = 'compressed-image';
    
    if (input instanceof File) {
      baseName = input.name.replace(/\.[^/.]+$/, '');
    }
    
    return `${baseName}.${format}`;
  }
}