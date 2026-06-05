<script setup lang="ts">
import { ref } from 'vue';
import { GroupGrid } from 'react-virtual-youth/vue';
import type { GroupGridRef, GroupItem } from 'react-virtual-youth/vue';

interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

interface Department {
  id: string;
  name: string;
  headcount: number;
}

const ROLES = ['前端工程师', '后端工程师', '产品经理', 'UI设计师', '测试工程师', '运维工程师'];
const DEPT_NAMES = ['技术部', '产品部', '设计部', '运营部', '市场部', '销售部', '人力资源', '财务部'];

function createDeptGroup(deptIndex: number, memberCount: number): GroupItem<Employee> & { dept: Department } {
  const deptName = DEPT_NAMES[deptIndex % DEPT_NAMES.length];
  return {
    key: `dept-${deptIndex}`,
    title: `${deptName}（${memberCount} 人）`,
    dept: { id: `dept-${deptIndex}`, name: deptName, headcount: memberCount },
    children: Array.from({ length: memberCount }, (_, i) => ({
      id: `${deptIndex}-${i}`,
      name: `员工 ${deptIndex * 100 + i}`,
      role: ROLES[(deptIndex + i) % ROLES.length],
      avatar: `${(deptIndex * 100 + i) % 70 + 1}`,
    })),
  };
}

const groups = Array.from({ length: 20 }, (_, i) =>
  createDeptGroup(i, Math.floor(Math.random() * 30) + 10),
);

const gridRef = ref<GroupGridRef | null>(null);
const containerWidth = 720;
</script>

<template>
  <div style="padding: 20px; font-family: sans-serif">
    <h2>Vue 分组虚拟网格 Demo — 20 个部门</h2>
    <p style="font-size: 13px; color: #666; margin-bottom: 12px">
      共 {{ groups.reduce((s, g) => s + g.children.length, 0) }} 名员工，按部门分组展示
    </p>

    <div style="border: 1px solid #d9d9d9; border-radius: 6px; overflow: hidden; width: 720px">
      <GroupGrid
        ref="gridRef"
        :groups="groups"
        :height="520"
        :item-height="100"
        :column-count="4"
        :scroll-width="containerWidth"
        :group-header-height="44"
        group-key="key"
        item-key="id"
      >
        <!-- 自定义分组头部 -->
        <template #header="{ group, index }">
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px',
              background: `hsl(${(index * 37) % 360}, 70%, 96%)`,
              borderLeft: `3px solid hsl(${(index * 37) % 360}, 70%, 55%)`,
              height: '100%',
            }"
          >
            <span style="font-weight: 600; font-size: 13px">{{ group.title }}</span>
          </div>
        </template>

        <!-- 员工卡片 -->
        <template #default="{ item }">
          <div style="width: 100%; height: 100%; padding: 6px; box-sizing: border-box">
            <div
              style="
                height: 100%;
                background: #fff;
                border: 1px solid #f0f0f0;
                border-radius: 8px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                text-align: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
              "
            >
              <div
                :style="{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `hsl(${parseInt(item.avatar) * 5}, 60%, 85%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: `hsl(${parseInt(item.avatar) * 5}, 60%, 40%)`,
                }"
              >
                {{ item.name.slice(-1) }}
              </div>
              <div style="font-size: 12px; font-weight: 500">{{ item.name }}</div>
              <div style="font-size: 11px; color: #8c8c8c">{{ item.role }}</div>
            </div>
          </div>
        </template>
      </GroupGrid>
    </div>
  </div>
</template>
