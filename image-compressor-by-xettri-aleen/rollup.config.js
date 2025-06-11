import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      isProduction && terser({
        format: {
          comments: false
        }
      })
    ].filter(Boolean),
    external: ['browser-image-compression']
  },
  
  // UMD build for direct browser usage (external dependencies)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'ImageSquash',
      sourcemap: true,
      exports: 'named',
      globals: {
        'browser-image-compression': 'imageCompression'
      }
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      isProduction && terser({
        format: {
          comments: false
        }
      })
    ].filter(Boolean),
    external: ['browser-image-compression']
  },
  
  // Self-contained build - use auto export mode
  {
    input: 'src/standalone-index.js',
    output: {
      file: 'dist/index.standalone.js',
      format: 'umd',
      name: 'ImageSquash',
      sourcemap: true,

      inlineDynamicImports: true
    },
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      isProduction && terser({
        format: {
          comments: false
        }
      })
    ].filter(Boolean)
  }
];