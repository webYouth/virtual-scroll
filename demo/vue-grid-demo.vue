<script setup lang="ts">
import { computed, ref } from 'vue';
import { Grid } from 'react-virtual-youth/vue';
import type { GridRef } from 'react-virtual-youth/vue';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

const CATEGORIES = ['电子', '服装', '食品', '家居', '图书'];

const data = Array.from<unknown, Product>({ length: 5000 }, (_, i) => ({
  id: i,
  name: `商品 ${i}`,
  price: Math.floor(Math.random() * 1000) + 10,
  stock: Math.floor(Math.random() * 200),
  category: CATEGORIES[i % CATEGORIES.length],
}));

const gridRef = ref<GridRef | null>(null);
const containerWidth = 800;
const columnCount = ref(4);
const columnWidth = computed(() => Math.floor(containerWidth / columnCount.value));

function scrollToRandom() {
  const index = Math.floor(Math.random() * data.length);
  gridRef.value?.scrollTo({ index, align: 'top' });
}
</script>

<template>
  <div style="padding: 20px; font-family: sans-serif">
    <h2>Vue 虚拟网格 Demo — 5,000 个商品</h2>

    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px">
      <label style="font-size: 13px">
        列数：
        <select
          v-model.number="columnCount"
          style="border: 1px solid #d9d9d9; border-radius: 4px; padding: 2px 8px"
        >
          <option :value="2">2 列</option>
          <option :value="3">3 列</option>
          <option :value="4">4 列</option>
          <option :value="5">5 列</option>
        </select>
      </label>
      <button
        style="padding: 4px 12px; border-radius: 4px; border: 1px solid #1677ff; color: #1677ff; cursor: pointer; background: #fff"
        @click="scrollToRandom"
      >
        随机跳转
      </button>
    </div>

    <div style="border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; width: 800px">
      <Grid
        ref="gridRef"
        :data="data"
        :height="480"
        :item-height="140"
        :column-count="columnCount"
        :scroll-width="containerWidth"
        item-key="id"
      >
        <template #default="{ item }">
          <div
            style="
              width: 100%; height: 100%;
              padding: 8px;
              box-sizing: border-box;
            "
          >
            <div
              style="
                height: 100%;
                background: #fff;
                border: 1px solid #f0f0f0;
                border-radius: 8px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 1px 4px rgba(0,0,0,0.06);
              "
            >
              <div>
                <div style="font-size: 13px; font-weight: 500; margin-bottom: 4px">{{ item.name }}</div>
                <span
                  style="font-size: 11px; color: #1677ff; background: #e6f4ff; padding: 1px 6px; border-radius: 4px"
                >
                  {{ item.category }}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline">
                <span style="font-size: 16px; font-weight: 600; color: #f5222d">
                  ¥{{ item.price }}
                </span>
                <span style="font-size: 11px; color: #8c8c8c">库存 {{ item.stock }}</span>
              </div>
            </div>
          </div>
        </template>
      </Grid>
    </div>
  </div>
</template>
