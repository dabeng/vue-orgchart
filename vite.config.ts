import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  publicDir: mode === 'library' ? false : 'public',
  build: mode === 'library' ? {
    outDir: 'dist',
    lib: { entry: 'src/components/index.js', name: 'VueOrgChart', formats: ['es', 'cjs'], fileName: format => `vue-orgchart.${format === 'es' ? 'js' : 'cjs'}`, cssFileName: 'vue-orgchart' },
    rollupOptions: { external: ['vue', 'html2canvas', 'jspdf'], output: { exports: 'named' } },
  } : { outDir: 'demo-dist' },
  test: {
    environment: 'jsdom', include: ['test/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/components/**/*.{ts,vue}'], reporter: ['text', 'html', 'lcov'] },
  },
}))