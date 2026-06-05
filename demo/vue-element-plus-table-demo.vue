<!--
  el-table + VirtualList 虚拟滚动集成方案
  ========================================
  核心思路：
    1. el-table 只负责渲染表头（传入空 data），保留它的列宽计算、排序、
       筛选、固定列等全部原生能力
    2. 用 CSS 隐藏 el-table 的 body wrapper（空数据时的占位区域）
    3. 在 el-table 下方挂载 VirtualList，读取 el-table header 的 colgroup
       动态同步列宽，保证表头和表体对齐
    4. 通过 MutationObserver 监听列宽变化（支持拖拽调整列宽）
    5. 双向同步横向滚动，让表头和表体始终对齐

  优点：
    - 完整保留 el-table 的表头能力（排序、筛选图标、多级表头、固定列等）
    - 虚拟滚动由 VirtualList 负责，极低 DOM 数量
    - 两者解耦，互不依赖内部实现细节

  适用场景：
    - 行数超过 5,000 条，el-table 原生渲染明显卡顿
    - 需要 el-table 原生表头功能（排序、筛选、列拖拽）
    - 行结构相对简单，不需要 el-table 的展开行、树形等复杂行特性
-->

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { List } from 'react-virtual-youth/vue';
import type { ListRef } from 'react-virtual-youth/vue';

// ─────────────────────────── 数据定义 ───────────────────────────

interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  salary: number;
  joinDate: string;
  status: 'active' | 'leave' | 'resigned';
  performance: number;
}

const DEPARTMENTS = ['技术部', '产品部', '设计部', '运营部', '市场部'];
const POSITIONS = ['工程师', '高级工程师', '主任工程师', '经理', '总监'];

// 生成 50,000 条数据
const rawData = Array.from<unknown, Employee>({ length: 50000 }, (_, i) => ({
  id: i + 1,
  name: `员工${String(i + 1).padStart(5, '0')}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  position: POSITIONS[i % POSITIONS.length],
  salary: 8000 + (i % 15) * 1000,
  joinDate: `202${Math.floor(i / 10000)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  status: (['active', 'active', 'active', 'leave', 'resigned'] as const)[i % 5],
  performance: Math.round((60 + (i % 40)) * 10) / 10,
}));

const ROW_HEIGHT = 48;

// ─────────────────────────── 排序 & 筛选 ───────────────────────────

const sortState = ref<{ prop: keyof Employee | ''; order: 'ascending' | 'descending' | null }>({
  prop: '',
  order: null,
});

// el-table 的 @sort-change 事件，触发虚拟体重排序
function handleSortChange({ prop, order }: { prop: string; order: string | null }) {
  sortState.value = { prop: prop as keyof Employee, order: order as 'ascending' | 'descending' | null };
}

const processedData = computed(() => {
  const { prop, order } = sortState.value;
  if (!prop || !order) return rawData;

  return [...rawData].sort((a, b) => {
    const av = a[prop];
    const bv = b[prop];
    const dir = order === 'ascending' ? 1 : -1;
    return av < bv ? -dir : av > bv ? dir : 0;
  });
});

// ─────────────────────────── 行选择 ───────────────────────────

const selectedIds = ref(new Set<number>());

function toggleRow(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
  // 触发 Vue 响应性
  selectedIds.value = new Set(selectedIds.value);
}

function toggleAll() {
  if (selectedIds.value.size === processedData.value.length) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(processedData.value.map((r) => r.id));
  }
}

const isAllSelected = computed(
  () => processedData.value.length > 0 && selectedIds.value.size === processedData.value.length,
);
const isIndeterminate = computed(
  () => selectedIds.value.size > 0 && selectedIds.value.size < processedData.value.length,
);

// ─────────────────────────── el-table + List 列宽同步 ───────────────────────────

const elTableRef = ref();
const listRef = ref<ListRef | null>(null);

/**
 * 存储从 el-table 的 colgroup 读取到的列宽列表。
 * 第一列是 selection 列（宽度固定），其余列按顺序对应业务列。
 */
const columnWidths = ref<number[]>([]);

/**
 * 从 el-table 表头的 colgroup 读取每列实际渲染宽度。
 * el-table 内部在 layout 后会把计算结果写入 colgroup col[style.width]。
 */
function syncColumnWidths() {
  const el = elTableRef.value?.$el as HTMLElement | undefined;
  if (!el) return;

  const cols = el.querySelectorAll<HTMLElement>('.el-table__header colgroup col');
  const widths: number[] = [];
  cols.forEach((col) => {
    const w = Number.parseInt(col.style.width);
    // 忽略 gutter 列（el-table 用来撑开滚动条空间的最后一列，宽度通常是 0 或 17）
    if (!isNaN(w) && w > 5) widths.push(w);
  });
  if (widths.length > 0) columnWidths.value = widths;
}

/**
 * 用 MutationObserver 监听 el-table colgroup 的变化，
 * 当用户拖拽调整列宽时自动重新同步。
 */
let colObserver: MutationObserver | null = null;

/**
 * 同步横向滚动：List body 横向滚动时，同步 el-table header 的 scrollLeft。
 */
function bindHorizontalScrollSync() {
  const bodyEl = listRef.value?.nativeElement;
  const headerWrapper = elTableRef.value?.$el?.querySelector<HTMLElement>(
    '.el-table__header-wrapper',
  );
  if (!bodyEl || !headerWrapper) return;

  bodyEl.addEventListener('scroll', () => {
    headerWrapper.scrollLeft = bodyEl.scrollLeft;
  });
}

onMounted(async () => {
  await nextTick();
  syncColumnWidths();

  // 监听 colgroup 属性变化（列宽拖拽调整）
  const colgroup = elTableRef.value?.$el?.querySelector('.el-table__header colgroup');
  if (colgroup) {
    colObserver = new MutationObserver(syncColumnWidths);
    colObserver.observe(colgroup, { attributes: true, subtree: true, attributeFilter: ['style'] });
  }

  bindHorizontalScrollSync();
});

onUnmounted(() => {
  colObserver?.disconnect();
});

// ─────────────────────────── 程序化跳转 ───────────────────────────

const jumpId = ref<number | null>(null);

function scrollToId() {
  if (jumpId.value === null) return;
  const index = processedData.value.findIndex((r) => r.id === jumpId.value);
  if (index >= 0) listRef.value?.scrollTo({ index, align: 'top' });
}

// ─────────────────────────── 工具函数 ───────────────────────────

const STATUS_MAP = {
  active: { label: '在职', type: 'success' },
  leave: { label: '休假', type: 'warning' },
  resigned: { label: '离职', type: 'danger' },
} as const;

function formatSalary(v: number) {
  return `¥${v.toLocaleString()}`;
}

function perfColor(v: number) {
  if (v >= 90) return '#52c41a';
  if (v >= 75) return '#1677ff';
  if (v >= 60) return '#fa8c16';
  return '#ff4d4f';
}
</script>

<template>
  <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif">
    <h2 style="margin-bottom: 4px">el-table + VirtualList 虚拟滚动集成</h2>
    <p style="color: #8c8c8c; font-size: 13px; margin-bottom: 16px">
      el-table 负责表头（排序、筛选），VirtualList 负责表体虚拟渲染，共 50,000 行
    </p>

    <!-- 工具栏 -->
    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap">
      <el-button
        :disabled="selectedIds.size === 0"
        type="primary"
        size="small"
        @click="() => alert(`批量操作 ${selectedIds.size} 条`)"
      >
        批量操作（{{ selectedIds.size }}）
      </el-button>

      <span style="font-size: 13px; color: #909399; margin-left: auto">
        共 {{ processedData.length.toLocaleString() }} 行
        <template v-if="sortState.prop">
          · 按 {{ sortState.prop }} {{ sortState.order === 'ascending' ? '升序' : '降序' }}
        </template>
      </span>

      <el-input-number
        v-model="jumpId"
        :min="1"
        :max="50000"
        placeholder="跳转到 ID"
        size="small"
        style="width: 140px"
        @keyup.enter="scrollToId"
      />
      <el-button size="small" type="primary" @click="scrollToId">定位</el-button>
    </div>

    <!--
      外层容器需要 overflow: hidden 防止 el-table 的 border 和 VirtualList 错位
    -->
    <div
      style="
        border: 1px solid #ebeef5;
        border-radius: 4px;
        overflow: hidden;
        background: #fff;
      "
    >
      <!--
        ① el-table：只传空 data，只渲染表头。
           用 CSS 隐藏 el-table 的 body-wrapper（"No Data" 区域）。
           sortable="custom" 阻止 el-table 自己排数据，
           sort-change 事件交给我们处理。
      -->
      <el-table
        ref="elTableRef"
        :data="[]"
        class="virtual-table-header-only"
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <!-- selection 列：由我们自己实现全选逻辑 -->
        <el-table-column width="55" align="center">
          <template #header>
            <el-checkbox
              :model-value="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="toggleAll"
            />
          </template>
        </el-table-column>

        <el-table-column prop="id" label="ID" width="90" align="right" sortable="custom" />
        <el-table-column prop="name" label="姓名" min-width="130" sortable="custom" />
        <el-table-column prop="department" label="部门" width="110" />
        <el-table-column prop="position" label="职位" width="130" />
        <el-table-column prop="salary" label="薪资" width="110" align="right" sortable="custom" />
        <el-table-column prop="joinDate" label="入职日期" width="115" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center" />
        <el-table-column prop="performance" label="绩效" width="90" align="right" sortable="custom" />
        <el-table-column label="操作" width="130" align="center" fixed="right" />
      </el-table>

      <!--
        ② VirtualList 表体：
           - columnWidths 与 el-table colgroup 同步，保证列对齐
           - 每行渲染一个 flex div，按 columnWidths 分配宽度
      -->
      <List
        ref="listRef"
        :data="processedData"
        :height="500"
        :item-height="ROW_HEIGHT"
        item-key="id"
        show-scroll-bar="optional"
      >
        <template #default="{ item, index }">
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              height: `${ROW_HEIGHT}px`,
              borderBottom: '1px solid #f2f6fc',
              background: selectedIds.has(item.id)
                ? '#ecf5ff'
                : index % 2 === 0 ? '#fff' : '#fafafa',
              boxSizing: 'border-box',
              fontSize: '13px',
              color: '#606266',
              cursor: 'pointer',
              transition: 'background-color 0.1s',
            }"
            @click="toggleRow(item.id)"
          >
            <!-- selection（对应 el-table-column width=55） -->
            <div
              :style="{ width: `${columnWidths[0] ?? 55}px`, flexShrink: 0, textAlign: 'center' }"
              @click.stop
            >
              <el-checkbox
                :model-value="selectedIds.has(item.id)"
                @change="toggleRow(item.id)"
              />
            </div>

            <!-- ID -->
            <div
              :style="{
                width: `${columnWidths[1] ?? 90}px`,
                flexShrink: 0,
                padding: '0 12px',
                textAlign: 'right',
                color: '#909399',
                fontSize: '12px',
              }"
            >
              {{ item.id }}
            </div>

            <!-- 姓名 -->
            <div
              :style="{
                width: `${columnWidths[2] ?? 130}px`,
                flexShrink: 0,
                padding: '0 12px',
                fontWeight: 500,
              }"
            >
              {{ item.name }}
            </div>

            <!-- 部门 -->
            <div :style="{ width: `${columnWidths[3] ?? 110}px`, flexShrink: 0, padding: '0 12px' }">
              {{ item.department }}
            </div>

            <!-- 职位 -->
            <div :style="{ width: `${columnWidths[4] ?? 130}px`, flexShrink: 0, padding: '0 12px', color: '#909399' }">
              {{ item.position }}
            </div>

            <!-- 薪资 -->
            <div
              :style="{
                width: `${columnWidths[5] ?? 110}px`,
                flexShrink: 0,
                padding: '0 12px',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }"
            >
              {{ formatSalary(item.salary) }}
            </div>

            <!-- 入职日期 -->
            <div
              :style="{
                width: `${columnWidths[6] ?? 115}px`,
                flexShrink: 0,
                padding: '0 12px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#909399',
              }"
            >
              {{ item.joinDate }}
            </div>

            <!-- 状态 -->
            <div
              :style="{
                width: `${columnWidths[7] ?? 90}px`,
                flexShrink: 0,
                padding: '0 12px',
                textAlign: 'center',
              }"
            >
              <el-tag :type="STATUS_MAP[item.status].type" size="small" style="font-size: 11px">
                {{ STATUS_MAP[item.status].label }}
              </el-tag>
            </div>

            <!-- 绩效 -->
            <div
              :style="{
                width: `${columnWidths[8] ?? 90}px`,
                flexShrink: 0,
                padding: '0 12px',
                textAlign: 'right',
                fontWeight: 600,
                color: perfColor(item.performance),
              }"
            >
              {{ item.performance }}
            </div>

            <!-- 操作（fixed="right"，固定在最右） -->
            <div
              :style="{
                width: `${columnWidths[9] ?? 130}px`,
                flexShrink: 0,
                padding: '0 12px',
                textAlign: 'center',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
              }"
              @click.stop
            >
              <el-button link type="primary" size="small" @click="() => alert(`查看 ${item.name}`)">查看</el-button>
              <el-button link type="success" size="small" @click="() => alert(`编辑 ${item.name}`)">编辑</el-button>
              <el-button link type="danger" size="small" @click="() => alert(`删除 ${item.name}`)">删除</el-button>
            </div>
          </div>
        </template>
      </List>
    </div>

    <p style="margin-top: 8px; font-size: 12px; color: #c0c4cc; text-align: right">
      VirtualList 仅挂载可见行 DOM · 50,000 行流畅滚动
    </p>
  </div>
</template>

<style scoped>
/*
  隐藏 el-table 的 body-wrapper（传 data=[] 时的空数据占位区）。
  只保留表头，表体由 VirtualList 接管。
*/
.virtual-table-header-only :deep(.el-table__body-wrapper) {
  display: none;
}

/*
  去掉 el-table 底部 border（因为 VirtualList 紧贴其下，
  否则会出现双线）
*/
.virtual-table-header-only :deep(.el-table__inner-wrapper::before) {
  display: none;
}
</style>
