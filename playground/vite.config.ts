import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 直接指向源码，无需先 build 库
      'react-virtual-youth/vue': resolve(__dirname, '../src/vue/index.ts'),
    },
  },
});
