import { detectCapabilities, hasStrictCSP } from '../utils/detection.js';
import { CanvasHandler } from './canvas-handler.js';
import { WasmHandler } from './wasm-handler.js';
import { WorkerHandler } from './worker-handler.js';
import { Logger } from '../utils/logger.js';
import { validateOptions, calculateStats, formatBytes } from '../utils/helpers.js';
import { LightweightHandler } from './light-weight-handler.js';

/**
 * Main compression function - this is where the magic happens
 * We automatically detect what the browser can do and pick the best method
 */
export async function compressImage(input, options = {}) {
  // First, let's make sure the options make sense
  const validatedOptions = validateOptions(options);
  const logger = new Logger(validatedOptions.enableLogging, validatedOptions.logLevel);
  
  logger.log('Starting image compression...', 'info');
  
  try {
    // Figure out what compression method we can actually use
    const capabilities = await detectCapabilities();
    const handler = selectBestHandler(capabilities, validatedOptions);
    
    logger.log(`Using compression method: ${handler.name}`, 'info');
    
    // Get the original file size for comparison later
    const originalSize = getInputSize(input);
    
    // Do the actual compression
    const result = await handler.compress(input, validatedOptions);
    
    // Calculate how much we saved
    const stats = calculateStats(originalSize, result.size, validatedOptions.format);
    
    // Show the results if logging is enabled
    if (validatedOptions.enableLogging) {
      logCompressionResults(stats, validatedOptions.logLevel);
    }
    
    return {
      blob: result.blob,
      file: result.file,
      stats: stats,
      method: handler.name
    };
    
  } catch (error) {
    logger.log(`Compression failed: ${error.message}`, 'error');
    throw new Error(`Image compression failed: ${error.message}`);
  }
}

/**
 * Compress multiple images at once - useful for batch operations
 * This processes them one by one to avoid overwhelming the browser
 */
export async function compressMultiple(images, options = {}) {
  const results = [];
  const logger = new Logger(options.enableLogging, options.logLevel);
  
  logger.log(`Starting batch compression of ${images.length} images`, 'info');
  
  for (let i = 0; i < images.length; i++) {
    try {
      logger.log(`Processing image ${i + 1}/${images.length}`, 'info');
      const result = await compressImage(images[i], options);
      results.push(result);
    } catch (error) {
      logger.log(`Failed to compress image ${i + 1}: ${error.message}`, 'error');
      // Keep going with other images even if one fails
      results.push({ error: error.message, index: i });
    }
  }
  
  // Show total savings across all images
  const successfulResults = results.filter(r => !r.error);
  if (successfulResults.length > 0) {
    logBatchResults(successfulResults, logger);
  }
  
  return results;
}

/**
 * Create a reusable compressor with preset options
 * This is handy when you want to compress lots of images with the same settings
 */
export function createCompressor(defaultOptions = {}) {
  return {
    compress: (input, options = {}) => {
      // Merge the default options with any new ones
      const mergedOptions = { ...defaultOptions, ...options };
      return compressImage(input, mergedOptions);
    },
    
    compressMultiple: (images, options = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      return compressMultiple(images, mergedOptions);
    }
  };
}

/**
 * Pick the best compression method based on what the browser supports
 * We prefer canvas (fastest) but fall back to workers or WASM if needed
 */
function selectBestHandler(capabilities, options) {
  // Try user preference first
  if (options.preferredMethod) {
    switch (options.preferredMethod) {
      case 'canvas':
        if (capabilities.canvas) return new CanvasHandler();
        break;
      case 'worker':
        if (capabilities.webWorkers) return new WorkerHandler();
        break;
      case 'wasm':
        return new WasmHandler(); // Uses browser-image-compression
        break;
      case 'lightweight':
        return new LightweightHandler(); // Pure browser APIs
    }
  }
  
  // Smart automatic selection
  if (capabilities.canvas && !hasStrictCSP()) {
    return new CanvasHandler(); // Fastest when available
  } else if (capabilities.webWorkers) {
    return new WorkerHandler(); // Good middle ground
  } else {
    // Try WASM first, fall back to lightweight
    try {
      return new WasmHandler();
    } catch (error) {
      console.warn('WASM handler failed to initialize, using lightweight fallback');
      return new LightweightHandler();
    }
  }
}

/**
 * Figure out how big the input file is
 * Different input types need different approaches
 */
function getInputSize(input) {
  if (input instanceof File || input instanceof Blob) {
    return input.size;
  } else if (typeof input === 'string') {
    // For data URLs, estimate the size
    return Math.round(input.length * 0.75); // Base64 overhead
  } else if (input instanceof HTMLImageElement) {
    // Can't get exact size, so we'll calculate it after loading
    return 0;
  }
  return 0;
}

/**
 * Show the compression results in a nice format
 * Different log levels show different amounts of detail
 */
function logCompressionResults(stats, logLevel) {
  if (logLevel === 'basic') {
    console.log(`🗜️ Compressed: ${formatBytes(stats.originalSize)} → ${formatBytes(stats.compressedSize)} (${stats.compressionRatio}% smaller)`);
  } else if (logLevel === 'detailed') {
    console.group('🗜️ Image Compression Results');
    console.log(`📁 Original Size: ${formatBytes(stats.originalSize)}`);
    console.log(`📦 Compressed Size: ${formatBytes(stats.compressedSize)}`);
    console.log(`📊 Compression Ratio: ${stats.compressionRatio}%`);
    console.log(`🎨 Output Format: ${stats.format.toUpperCase()}`);
    console.log(`💾 Space Saved: ${formatBytes(stats.savedBytes)}`);
    console.groupEnd();
  }
}

/**
 * Show results for batch compression
 * This gives a nice summary of the total savings
 */
function logBatchResults(results, logger) {
  const totalOriginal = results.reduce((sum, r) => sum + r.stats.originalSize, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.stats.compressedSize, 0);
  const totalSaved = totalOriginal - totalCompressed;
  const overallRatio = Math.round((totalSaved / totalOriginal) * 100);
  
  logger.log('📊 Batch Compression Complete', 'info');
  logger.log(`Total files processed: ${results.length}`, 'info');
  logger.log(`Total size reduction: ${formatBytes(totalOriginal)} → ${formatBytes(totalCompressed)}`, 'info');
  logger.log(`Overall savings: ${formatBytes(totalSaved)} (${overallRatio}% reduction)`, 'info');
}