import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './static',
  server: {
    port: 3000
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  build: {
    outDir: './dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'static/index.html')
      }
    }
  }
});
