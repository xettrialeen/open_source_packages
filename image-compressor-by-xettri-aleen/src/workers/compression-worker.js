/**
 * Standalone Web Worker for image compression
 * This file can be loaded as a separate worker script
 */

// Worker script that handles image compression in the background
self.onmessage = async function(e) {
    const { type, id, imageData, options } = e.data;
    
    if (type === 'compress') {
      try {
        const result = await compressImageInWorker(imageData, options);
        
        // Send the result back to the main thread
        self.postMessage({
          type: 'success',
          id: id,
          blob: result.blob,
          width: result.width,
          height: result.height
        });
        
      } catch (error) {
        // Send error back to main thread
        self.postMessage({
          type: 'error',
          id: id,
          error: error.message
        });
      }
    }
  };
  
  /**
   * Main compression function that runs inside the worker
   */
  async function compressImageInWorker(imageData, options) {
    try {
      let canvas;
      let ctx;
      let sourceImage;
      
      // Handle different input types
      if (imageData.type === 'blob') {
        const blob = new Blob([imageData.data], { type: imageData.mimeType });
        sourceImage = await createImageBitmap(blob);
        
      } else if (imageData.type === 'dataUrl') {
        const response = await fetch(imageData.data);
        const blob = await response.blob();
        sourceImage = await createImageBitmap(blob);
        
      } else if (imageData.type === 'imageData') {
        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );
        sourceImage = await createImageBitmap(imgData);
      }
      
      // Calculate output dimensions
      const dimensions = calculateOutputDimensions(sourceImage, options);
      
      // Create OffscreenCanvas
      canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
      ctx = canvas.getContext('2d');
      
      // Draw the image with the new dimensions
      ctx.drawImage(sourceImage, 0, 0, dimensions.width, dimensions.height);
      
      // Convert to blob with compression
      const mimeType = getMimeTypeFromFormat(options.format);
      const blob = await canvas.convertToBlob({
        type: mimeType,
        quality: options.quality
      });
      
      return {
        blob: blob,
        width: dimensions.width,
        height: dimensions.height
      };
      
    } catch (error) {
      throw new Error(`Worker compression failed: ${error.message}`);
    }
  }
  
  function calculateOutputDimensions(image, options) {
    let width = image.width;
    let height = image.height;
    
    if (!options.maxWidth && !options.maxHeight) {
      return { width, height };
    }
    
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
  
  function getMimeTypeFromFormat(format) {
    const mimeTypes = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    };
    
    return mimeTypes[format.toLowerCase()] || 'image/jpeg';
  }
  
  // Signal that the worker is ready
  self.postMessage({ type: 'ready' });