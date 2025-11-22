import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  format: 'esm',
  platform: 'browser',
  unbundle: true,
  treeshake: true,
  minify: true,
  // Target browsers that support ES modules natively
  // Chrome 61+, Firefox 60+, Safari 11+, Edge 16+, Opera 48+
  target: [
    'chrome61',
    'firefox60',
    'safari11',
    'edge16',
    'opera48'
  ]
});
