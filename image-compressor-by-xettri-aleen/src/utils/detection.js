/**
 * Figure out what compression methods the browser supports
 * This helps us pick the best approach automatically
 */
export async function detectCapabilities() {
    const capabilities = {
      canvas: false,
      webWorkers: false,
      offscreenCanvas: false,
      webAssembly: false,
      formats: {
        webp: false,
        jpeg: true,  // JPEG is supported everywhere
        png: true    // PNG is supported everywhere
      }
    };
    
    // Test canvas support
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Try to create a small image to test toBlob
        canvas.width = 1;
        canvas.height = 1;
        ctx.fillRect(0, 0, 1, 1);
        
        await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              capabilities.canvas = true;
              resolve();
            } else {
              reject();
            }
          }, 'image/jpeg', 0.5);
        });
      }
    } catch (error) {
      // Canvas is blocked or not supported
      capabilities.canvas = false;
    }
    
    // Test Web Workers
    try {
      if (typeof Worker !== 'undefined') {
        capabilities.webWorkers = true;
      }
    } catch (error) {
      capabilities.webWorkers = false;
    }
    
    // Test OffscreenCanvas (useful for workers)
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        capabilities.offscreenCanvas = true;
      }
    } catch (error) {
      capabilities.offscreenCanvas = false;
    }
    
    // Test WebAssembly
    try {
      if (typeof WebAssembly !== 'undefined') {
        capabilities.webAssembly = true;
      }
    } catch (error) {
      capabilities.webAssembly = false;
    }
    
    // Test WebP support
    capabilities.formats.webp = await testWebPSupport();
    
    return capabilities;
  }
  
  /**
   * Test if the browser can handle WebP images
   * We do this by trying to create a tiny WebP image
   */
  async function testWebPSupport() {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        canvas.toBlob((blob) => {
          resolve(blob !== null);
        }, 'image/webp', 0.5);
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  /**
   * Check if we're running in a context with strict CSP
   * This helps us avoid methods that won't work
   */
  export function hasStrictCSP() {
    try {
      // Try to create a blob URL - this is often blocked by CSP
      const blob = new Blob(['test'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      URL.revokeObjectURL(url);
      return false;
    } catch (error) {
      return true;
    }
  }
  
  /**
   * Test if we can use canvas operations
   * Sometimes canvas exists but specific operations are blocked
   */
  export function canUseCanvasOperations() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return false;
      
      // Test if we can create ImageData
      ctx.createImageData(1, 1);
      
      // Test if we can read pixel data
      canvas.width = 1;
      canvas.height = 1;
      ctx.getImageData(0, 0, 1, 1);
      
      return true;
    } catch (error) {
      return false;
    }
  }