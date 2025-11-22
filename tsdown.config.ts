import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  format: 'esm',
  platform: 'browser',
  unbundle: true,
  treeshake: true,
  minify: true,
});
