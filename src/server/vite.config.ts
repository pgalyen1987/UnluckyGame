import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  logLevel: 'warn',
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'Devvit.createElement',
    jsxFragment: 'Devvit.Fragment',
  },
  build: {
    ssr: 'index.ts',
    outDir: '../../dist/server',
    emptyOutDir: true,
    target: 'node20',
    sourcemap: true,
    commonjsOptions: {
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
});
