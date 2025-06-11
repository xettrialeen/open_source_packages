import { createCompressor, compressImage, compressMultiple } from './core/compressor.js';
import { QUALITY_PRESETS, FORMAT_OPTIONS } from './utils/helpers.js';

// Create the global object that will be exposed - ONLY default export
const ImageSquash = {
  // Main compression functions
  compress: compressImage,           // Alias for easier use
  compressImage: compressImage,      // Also expose original name
  compressMultiple: compressMultiple,
  createCompressor: createCompressor,
  
  // Presets and constants
  presets: QUALITY_PRESETS,
  formats: FORMAT_OPTIONS,
  QUALITY_PRESETS: QUALITY_PRESETS,
  FORMAT_OPTIONS: FORMAT_OPTIONS,
  
  // Version info
  version: '1.0.0'
};

// ONLY default export - no named exports for standalone
export default ImageSquash;