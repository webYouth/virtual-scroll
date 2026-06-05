<script setup lang="ts">
import { ref } from 'vue';
// 从 vue 入口导入
import { List } from 'react-virtual-youth/vue';
import type { ListRef } from 'react-virtual-youth/vue';

interface Item {
  id: number;
  name: string;
  description: string;
  tag: string;
}

const TAGS = ['重要', '普通', '待处理', '已完成'];

const data = Array.from<unknown, Item>({ length: 10000 }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  description: `这是第 ${i} 条数据的描述信息`,
  tag: TAGS[i % TAGS.length],
}));

const listRef = ref<ListRef | null>(null);
const scrollInfo = ref({ x: 0, y: 0 });
const jumpIndex = ref(0);

function scrollToIndex() {
  listRef.value?.scrollTo({ index: jumpIndex.value, align: 'top' });
}

function scrollToTop() {
  listRef.value?.scrollTo(0);
}
</script>

<template>
  <div style="padding: 20px; font-family: sans-serif">
    <h2>Vue 虚拟列表 Demo — 10,000 条数据</h2>

    <!-- 控制栏 -->
    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px">
      <span style="font-size: 13px; color: #666">
        Y 偏移: {{ scrollInfo.y.toFixed(0) }}px
      </span>
      <input
        v-model.number="jumpIndex"
        type="number"
        min="0"
        max="9999"
        placeholder="跳转到第 N 条"
        style="border: 1px solid #d9d9d9; border-radius: 4px; padding: 4px 8px; width: 140px"
      />
      <button
        style="padding: 4px 12px; border-radius: 4px; border: 1px solid #1677ff; color: #1677ff; cursor: pointer; background: #fff"
        @click="scrollToIndex"
      >
        跳转
      </button>
      <button
        style="padding: 4px 12px; border-radius: 4px; border: 1px solid #d9d9d9; cursor: pointer; background: #fff"
        @click="scrollToTop"
      >
        回到顶部
      </button>
    </div>

    <!-- 虚拟列表 -->
    <div style="border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; width: 400px">
      <List
        ref="listRef"
        :data="data"
        :height="480"
        :item-height="64"
        item-key="id"
        @on-virtual-scroll="(info) => (scrollInfo = info)"
      >
        <template #default="{ item, index, style }">
          <div
            :style="{
              ...style,
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff',
              boxSizing: 'border-box',
            }"
          >
            <div>
              <div style="font-weight: 500; font-size: 14px">{{ item.name }}</div>
              <div style="font-size: 12px; color: #999; margin-top: 2px">{{ item.description }}</div>
            </div>
            <span
              :style="{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: ['#e6f4ff', '#f6ffed', '#fffbe6', '#f9f0ff'][item.id % 4],
                color: ['#1677ff', '#52c41a', '#faad14', '#722ed1'][item.id % 4],
              }"
            >
              {{ item.tag }}
            </span>
          </div>
        </template>
      </List>
    </div>
  </div>
</template>
