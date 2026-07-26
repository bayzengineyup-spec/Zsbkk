/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Göreli taban: build çıktısı her yerden (dosya sistemi, alt dizin, PWA) çalışır.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
