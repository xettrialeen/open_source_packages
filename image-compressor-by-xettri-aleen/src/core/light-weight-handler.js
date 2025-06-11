/**
 * Lightweight compression using just browser APIs
 * No external dependencies, works everywhere
 */
export class LightweightHandler {
    constructor() {
      this.name = 'lightweight';
    }
    
    async compress(input, options) {
      try {
        // Convert input to canvas
        const { canvas, originalWidth, originalHeight } = await this.inputToCanvas(input);
        
        // Resize if needed
        this.resizeCanvas(canvas, options, originalWidth, originalHeight);
        
        // Compress using canvas toBlob
        const blob = await this.canvasToBlob(canvas, options);
        
        // Create file
        const filename = this.generateFilename(input, options.format);
        const file = new File([blob], filename, { type: blob.type });
        
        return {
          blob,
          file,
          size: blob.size
        };
        
      } catch (error) {
        throw new Error(`Lightweight compression failed: ${error.message}`);
      }
    }
    
    async inputToCanvas(input) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let img;
      let originalWidth, originalHeight;
      
      if (input instanceof File || input instanceof Blob) {
        img = await this.createImageFromBlob(input);
      } else if (typeof input === 'string') {
        img = await this.createImageFromUrl(input);
      } else if (input instanceof HTMLImageElement) {
        img = input;
      }
      
      originalWidth = img.naturalWidth || img.width;
      originalHeight = img.naturalHeight || img.height;
      
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      ctx.drawImage(img, 0, 0);
      
      return { canvas, originalWidth, originalHeight };
    }
    
    createImageFromBlob(blob) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image from blob'));
        };
        
        img.src = url;
      });
    }
    
    createImageFromUrl(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image from URL'));
        img.src = url;
      });
    }
    
    resizeCanvas(canvas, options, originalWidth, originalHeight) {
      if (!options.maxWidth && !options.maxHeight) {
        return; // No resizing needed
      }
      
      let newWidth = originalWidth;
      let newHeight = originalHeight;
      
      // Calculate new dimensions
      if (options.maxWidth && newWidth > options.maxWidth) {
        const ratio = options.maxWidth / newWidth;
        newWidth = options.maxWidth;
        newHeight = Math.round(newHeight * ratio);
      }
      
      if (options.maxHeight && newHeight > options.maxHeight) {
        const ratio = options.maxHeight / newHeight;
        newHeight = options.maxHeight;
        newWidth = Math.round(newWidth * ratio);
      }
      
      // Only resize if dimensions actually changed
      if (newWidth !== originalWidth || newHeight !== originalHeight) {
        const originalImageData = canvas.getContext('2d').getImageData(0, 0, originalWidth, originalHeight);
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.putImageData(this.resizeImageData(originalImageData, newWidth, newHeight), 0, 0);
      }
    }
    
    /**
     * Simple bilinear interpolation for resizing
     * Not as good as fancy algorithms but works without dependencies
     */
    resizeImageData(imageData, newWidth, newHeight) {
      const { width: oldWidth, height: oldHeight, data: oldData } = imageData;
      const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
      
      const xRatio = oldWidth / newWidth;
      const yRatio = oldHeight / newHeight;
      
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          const sourceX = Math.floor(x * xRatio);
          const sourceY = Math.floor(y * yRatio);
          
          const sourceIndex = (sourceY * oldWidth + sourceX) * 4;
          const targetIndex = (y * newWidth + x) * 4;
          
          // Copy RGBA values
          newData[targetIndex] = oldData[sourceIndex];         // R
          newData[targetIndex + 1] = oldData[sourceIndex + 1]; // G
          newData[targetIndex + 2] = oldData[sourceIndex + 2]; // B
          newData[targetIndex + 3] = oldData[sourceIndex + 3]; // A
        }
      }
      
      return new ImageData(newData, newWidth, newHeight);
    }
    
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