/**
 * Web Worker based compression
 * This is great when canvas is blocked but workers are allowed
 */
export class WorkerHandler {
    constructor() {
      this.name = 'worker';
      this.worker = null;
    }
    
    async compress(input, options) {
      try {
        // Initialize worker if needed
        if (!this.worker) {
          await this.initializeWorker();
        }
        
        // Convert input to transferable format
        const imageData = await this.prepareImageData(input);
        
        // Send to worker and wait for result
        const result = await this.compressInWorker(imageData, options);
        
        // Create file object
        const filename = this.generateFilename(input, options.format);
        const file = new File([result.blob], filename, { type: result.blob.type });
        
        return {
          blob: result.blob,
          file: file,
          size: result.blob.size
        };
        
      } catch (error) {
        throw new Error(`Worker compression failed: ${error.message}`);
      }
    }
    
    /**
     * Create and initialize the compression worker
     */
    async initializeWorker() {
      return new Promise((resolve, reject) => {
        try {
          // Create worker from inline script to avoid CSP issues with external files
          const workerScript = this.getWorkerScript();
          const blob = new Blob([workerScript], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          
          this.worker = new Worker(workerUrl);
          
          this.worker.onmessage = (e) => {
            if (e.data.type === 'ready') {
              URL.revokeObjectURL(workerUrl);
              resolve();
            }
          };
          
          this.worker.onerror = (error) => {
            reject(new Error(`Worker initialization failed: ${error.message}`));
          };
          
        } catch (error) {
          reject(error);
        }
      });
    }
    
    /**
     * Prepare image data for sending to worker
     * We need to convert it to a format that can be transferred
     */
    async prepareImageData(input) {
      if (input instanceof File || input instanceof Blob) {
        const arrayBuffer = await input.arrayBuffer();
        return {
          type: 'blob',
          data: arrayBuffer,
          mimeType: input.type
        };
      } else if (typeof input === 'string') {
        return {
          type: 'dataUrl',
          data: input
        };
      } else if (input instanceof HTMLImageElement) {
        // Convert to canvas first
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = input.naturalWidth;
        canvas.height = input.naturalHeight;
        ctx.drawImage(input, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return {
          type: 'imageData',
          data: imageData.data,
          width: canvas.width,
          height: canvas.height
        };
      }
      
      throw new Error('Unsupported input type for worker compression');
    }
    
    /**
     * Send compression job to worker and wait for result
     */
    compressInWorker(imageData, options) {
      return new Promise((resolve, reject) => {
        const jobId = Math.random().toString(36).substr(2, 9);
        
        const handleMessage = (e) => {
          const { type, id, blob, error } = e.data;
          
          if (id !== jobId) return;
          
          this.worker.removeEventListener('message', handleMessage);
          
          if (type === 'success') {
            resolve({ blob });
          } else if (type === 'error') {
            reject(new Error(error));
          }
        };
        
        this.worker.addEventListener('message', handleMessage);
        
        this.worker.postMessage({
          type: 'compress',
          id: jobId,
          imageData,
          options
        });
      });
    }
    
    /**
     * Generate the worker script as a string
     * This avoids CSP issues with external worker files
     */
    getWorkerScript() {
      return `
        // Worker script for image compression
        // This runs in a separate thread and has more relaxed CSP rules
        
        self.onmessage = async function(e) {
          const { type, id, imageData, options } = e.data;
          
          if (type === 'compress') {
            try {
              const result = await compressImage(imageData, options);
              self.postMessage({
                type: 'success',
                id: id,
                blob: result.blob
              });
            } catch (error) {
              self.postMessage({
                type: 'error',
                id: id,
                error: error.message
              });
            }
          }
        };
        
        async function compressImage(imageData, options) {
          // Create OffscreenCanvas (available in workers)
          const canvas = new OffscreenCanvas(100, 100);
          const ctx = canvas.getContext('2d');
          
          let image;
          
          if (imageData.type === 'blob') {
            const blob = new Blob([imageData.data], { type: imageData.mimeType });
            image = await createImageBitmap(blob);
          } else if (imageData.type === 'dataUrl') {
            const response = await fetch(imageData.data);
            const blob = await response.blob();
            image = await createImageBitmap(blob);
          } else if (imageData.type === 'imageData') {
            const imgData = new ImageData(
              new Uint8ClampedArray(imageData.data),
              imageData.width,
              imageData.height
            );
            image = await createImageBitmap(imgData);
          }
          
          // Calculate dimensions
          const { width, height } = calculateDimensions(image, options);
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(image, 0, 0, width, height);
          
          const mimeType = getMimeType(options.format);
          const blob = await canvas.convertToBlob({
            type: mimeType,
            quality: options.quality
          });
          
          return { blob };
        }
        
        function calculateDimensions(image, options) {
          let { width, height } = image;
          
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
        
        function getMimeType(format) {
          const mimeTypes = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
          };
          
          return mimeTypes[format.toLowerCase()] || 'image/jpeg';
        }
        
        // Signal that worker is ready
        self.postMessage({ type: 'ready' });
      `;
    }
    
    generateFilename(input, format) {
      let baseName = 'compressed-image';
      
      if (input instanceof File) {
        baseName = input.name.replace(/\.[^/.]+$/, '');
      }
      
      return `${baseName}.${format}`;
    }
    
    /**
     * Clean up the worker when we're done
     */
    destroy() {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  }