import { defineConfig } from 'vite';

/** GitHub project pages live at /UnluckyGame/; Devvit bundles use relative paths. */
const pagesBase = process.env.GITHUB_PAGES === '1' ? '/UnluckyGame/' : './';

export default defineConfig(({ mode }) => ({
  base: pagesBase,
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
        'game-three': 'game-three.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/three')) return 'three';
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
