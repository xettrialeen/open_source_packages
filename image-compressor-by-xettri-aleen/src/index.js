import { createCompressor, compressImage, compressMultiple } from './core/compressor.js';
import { QUALITY_PRESETS, FORMAT_OPTIONS } from './utils/helpers.js';

// Main exports 
export {
  compressImage,
  compressMultiple,
  createCompressor,
  QUALITY_PRESETS,
  FORMAT_OPTIONS
};

// Default export for easier imports
export default {
  compress: compressImage,
  compressMultiple,
  createCompressor,
  presets: QUALITY_PRESETS,
  formats: FORMAT_OPTIONS
};