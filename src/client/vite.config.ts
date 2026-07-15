import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  logLevel: 'warn',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        splash: 'splash.html',
        game: 'game.html',
      },
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
    ...(mode === 'production' && {
      minify: 'terser' as const,
      terserOptions: {
        compress: { passes: 2 },
        mangle: true,
        format: { comments: false },
      },
    }),
  },
}));
