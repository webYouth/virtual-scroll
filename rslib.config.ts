import { pluginReact } from '@rsbuild/plugin-react';
import { pluginVue } from '@rsbuild/plugin-vue';
import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    // React build: each file transpiled individually → dist/react/
    {
      bundle: false,
      dts: {
        tsconfig: './tsconfig.json',
      },
      format: 'esm',
      source: {
        entry: {
          index: ['./src/**', '!./src/vue/**'],
        },
      },
      output: {
        distPath: {
          root: './dist/react',
        },
        target: 'web',
      },
      plugins: [pluginReact()],
    },
    // Vue build: bundled into a single ESM with vue as external → dist/vue/index.js
    {
      bundle: true,
      dts: {
        tsconfig: './tsconfig.vue.json',
      },
      format: 'esm',
      source: {
        entry: {
          index: './src/vue/index.ts',
        },
      },
      output: {
        distPath: {
          root: './dist/vue',
        },
        target: 'web',
        externals: ['vue'],
      },
      plugins: [pluginVue()],
    },
  ],
});
