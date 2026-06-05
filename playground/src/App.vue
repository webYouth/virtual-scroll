<script setup lang="ts">
import { ref } from 'vue';
import ListDemo from '../../demo/vue-list-demo.vue';
import GridDemo from '../../demo/vue-grid-demo.vue';
import GroupGridDemo from '../../demo/vue-group-grid-demo.vue';
import ElTableDemo from '../../demo/vue-element-plus-table-demo.vue';

type Tab = 'list' | 'grid' | 'group-grid' | 'el-table';
const activeTab = ref<Tab>('list');

const tabs: { key: Tab; label: string }[] = [
  { key: 'list', label: 'List 虚拟列表' },
  { key: 'grid', label: 'Grid 虚拟网格' },
  { key: 'group-grid', label: 'GroupGrid 分组网格' },
  { key: 'el-table', label: 'el-table 集成' },
];
</script>

<template>
  <div style="min-height: 100vh; background: #f5f7fa">
    <!-- 顶栏 -->
    <div
      style="
        background: #fff;
        border-bottom: 1px solid #e4e7ed;
        padding: 0 24px;
        display: flex;
        align-items: center;
        gap: 0;
        height: 52px;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      "
    >
      <span style="font-weight: 700; font-size: 16px; color: #303133; margin-right: 32px">
        Virtual Scroll Playground
      </span>

      <div style="display: flex; gap: 2px">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :style="{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: activeTab === tab.key ? 600 : 400,
            background: activeTab === tab.key ? '#409eff1a' : 'transparent',
            color: activeTab === tab.key ? '#409eff' : '#606266',
            transition: 'all 0.15s',
          }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div style="padding: 8px 0">
      <ListDemo v-if="activeTab === 'list'" />
      <GridDemo v-else-if="activeTab === 'grid'" />
      <GroupGridDemo v-else-if="activeTab === 'group-grid'" />
      <ElTableDemo v-else-if="activeTab === 'el-table'" />
    </div>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
