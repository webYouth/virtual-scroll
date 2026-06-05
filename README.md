# react-virtual-youth

<p align="center">
  <strong>高性能虚拟滚动列表 / 网格组件，同时支持 React 和 Vue 3</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/react-virtual-youth">
    <img src="https://img.shields.io/npm/v/react-virtual-youth.svg?style=flat-square" alt="npm version" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/npm/l/react-virtual-youth.svg?style=flat-square" alt="license" />
  </a>
  <a href="https://www.npmjs.com/package/react-virtual-youth">
    <img src="https://img.shields.io/npm/dm/react-virtual-youth.svg?style=flat-square" alt="downloads" />
  </a>
  <img src="https://img.shields.io/badge/React-%3E%3D16.9-blue?style=flat-square" alt="React" />
  <img src="https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square" alt="Vue" />
  <img src="https://img.shields.io/badge/TypeScript-✓-3178c6?style=flat-square" alt="TypeScript" />
</p>

---

## 目录

- [特性](#-特性)
- [安装](#-安装)
- [快速上手](#-快速上手)
  - [React](#react)
  - [Vue 3](#vue-3)
- [组件](#-组件)
  - [List — 虚拟列表](#list--虚拟列表)
  - [Grid — 虚拟网格](#grid--虚拟网格)
  - [GroupGrid — 分组虚拟网格](#groupgrid--分组虚拟网格)
- [API 参考](#-api-参考)
  - [List Props](#list-props)
  - [Grid Props](#grid-props)
  - [GroupGrid Props](#groupgrid-props)
  - [Ref 方法](#ref-方法)
  - [类型定义](#类型定义)
- [进阶用法](#-进阶用法)
  - [程序化滚动](#程序化滚动)
  - [动态高度](#动态高度)
  - [水平滚动](#水平滚动)
  - [RTL 支持](#rtl-支持)
  - [自定义滚动条样式](#自定义滚动条样式)
- [与 Element Plus 集成](#-与-element-plus-集成)
- [Vue 与 React API 差异](#-vue-与-react-api-差异)
- [开发](#-开发)
- [许可证](#-许可证)

---

## ✨ 特性

| 特性 | 说明 |
|------|------|
| **高性能** | 虚拟渲染技术，仅挂载可见区域的 DOM 节点，轻松支持 10 万+ 数据 |
| **双框架** | React 16.9+ 和 Vue 3.2+ 共享同一套 npm 包，API 高度对齐 |
| **三种布局** | `List`（单列列表）、`Grid`（多列网格）、`GroupGrid`（分组网格） |
| **程序化滚动** | `scrollTo(index)` / `scrollTo({ key, align })` 精准定位任意行 |
| **动态高度** | 支持每项高度不固定，自动测量并缓存 |
| **触摸友好** | 原生 touch 事件 + 惯性滚动，移动端体验流畅 |
| **拖拽滚动** | 鼠标拖拽滚动条，自定义样式滚动条 |
| **RTL** | 完整右到左（阿拉伯语 / 希伯来语等）布局支持 |
| **TypeScript** | 完整类型声明，开箱即用 |

---

## 📦 安装

```bash
# npm
npm install react-virtual-youth

# yarn
yarn add react-virtual-youth

# pnpm
pnpm add react-virtual-youth
```

**对等依赖（按需安装）**

```bash
# 仅用 React
pnpm add react react-dom

# 仅用 Vue
pnpm add vue

# 两者都用
pnpm add react react-dom vue
```

---

## 🚀 快速上手

### React

```tsx
import List from 'react-virtual-youth';
// 或
import { List } from 'react-virtual-youth/react';

const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));

export default function App() {
  return (
    <List data={data} height={400} itemHeight={54} itemKey="id">
      {(item, index) => (
        <div style={{ height: 54, lineHeight: '54px', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
          {item.text}
        </div>
      )}
    </List>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { List } from 'react-virtual-youth/vue';

const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
</script>

<template>
  <List :data="data" :height="400" :item-height="54" item-key="id">
    <template #default="{ item, index }">
      <div :style="{ height: '54px', lineHeight: '54px', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }">
        {{ item.text }}
      </div>
    </template>
  </List>
</template>
```

---

## 🧩 组件

### List — 虚拟列表

单列线性列表，适用于聊天消息、文件列表、日志流等场景。

**React**

```tsx
import { useRef } from 'react';
import List, { type ListRef } from 'react-virtual-youth';

interface Item { id: number; name: string; desc: string }
const data: Item[] = Array.from({ length: 50000 }, (_, i) => ({
  id: i,
  name: `条目 ${i}`,
  desc: `描述信息 ${i}`,
}));

export default function VirtualListDemo() {
  const listRef = useRef<ListRef>(null);

  return (
    <>
      <button onClick={() => listRef.current?.scrollTo({ index: 9999, align: 'top' })}>
        跳转到末尾
      </button>

      <List
        ref={listRef}
        data={data}
        height={500}
        itemHeight={64}
        itemKey="id"
        onVirtualScroll={({ x, y }) => console.log('scrollY:', y)}
        onVisibleChange={(visible, full) =>
          console.log(`visible: ${visible.length} / ${full.length}`)
        }
      >
        {(item, index) => (
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              borderBottom: '1px solid #f0f0f0',
              background: index % 2 ? '#fafafa' : '#fff',
            }}
          >
            <strong>{item.name}</strong>
            <span style={{ color: '#8c8c8c', marginLeft: 8 }}>{item.desc}</span>
          </div>
        )}
      </List>
    </>
  );
}
```

**Vue 3**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { List } from 'react-virtual-youth/vue';
import type { ListRef } from 'react-virtual-youth/vue';

interface Item { id: number; name: string; desc: string }
const data: Item[] = Array.from({ length: 50000 }, (_, i) => ({
  id: i, name: `条目 ${i}`, desc: `描述信息 ${i}`,
}));

const listRef = ref<ListRef | null>(null);
const toBottom = () => listRef.value?.scrollTo({ index: data.length - 1, align: 'bottom' });
</script>

<template>
  <button @click="toBottom">跳转到末尾</button>

  <List
    ref="listRef"
    :data="data"
    :height="500"
    :item-height="64"
    item-key="id"
    @on-virtual-scroll="({ x, y }) => console.log('scrollY:', y)"
    @on-visible-change="(visible, full) => console.log(visible.length, full.length)"
  >
    <template #default="{ item, index }">
      <div
        :style="{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #f0f0f0',
          background: index % 2 ? '#fafafa' : '#fff',
        }"
      >
        <strong>{{ item.name }}</strong>
        <span style="color: #8c8c8c; margin-left: 8px">{{ item.desc }}</span>
      </div>
    </template>
  </List>
</template>
```

---

### Grid — 虚拟网格

多列瀑布流网格，适用于图片墙、商品列表、媒体库等场景。

**React**

```tsx
import Grid from 'react-virtual-youth/Grid';

const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `商品 ${i}` }));

export default function GridDemo() {
  return (
    <Grid
      data={data}
      height={500}
      itemHeight={160}
      columnCount={4}
      scrollWidth={800}
      itemKey="id"
    >
      {(item) => (
        <div style={{ padding: 8, boxSizing: 'border-box', height: '100%' }}>
          <div style={{ background: '#f5f5f5', borderRadius: 8, height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.name}
          </div>
        </div>
      )}
    </Grid>
  );
}
```

**Vue 3**

```vue
<script setup lang="ts">
import { Grid } from 'react-virtual-youth/vue';

const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `商品 ${i}` }));
</script>

<template>
  <Grid
    :data="data"
    :height="500"
    :item-height="160"
    :column-count="4"
    :scroll-width="800"
    item-key="id"
  >
    <template #default="{ item }">
      <div style="padding: 8px; box-sizing: border-box; height: 100%">
        <div style="background: #f5f5f5; border-radius: 8px; height: 100%;
          display: flex; align-items: center; justify-content: center">
          {{ item.name }}
        </div>
      </div>
    </template>
  </Grid>
</template>
```

> **列数计算优先级**：`columnCount` > `columnWidth` > `itemWidth`。
> 建议始终传入 `scrollWidth` 以保证布局精确。

---

### GroupGrid — 分组虚拟网格

带分组标题的多列网格，适用于分类商品、部门成员、相册等场景。

**React**

```tsx
import GroupGrid from 'react-virtual-youth/GroupGrid';

const groups = [
  {
    key: 'electronics',
    title: '电子产品',
    children: Array.from({ length: 200 }, (_, i) => ({ id: `e${i}`, name: `电子 ${i}` })),
  },
  {
    key: 'clothing',
    title: '服装',
    children: Array.from({ length: 150 }, (_, i) => ({ id: `c${i}`, name: `服装 ${i}` })),
  },
];

export default function GroupGridDemo() {
  return (
    <GroupGrid
      groups={groups}
      height={500}
      itemHeight={120}
      columnCount={4}
      scrollWidth={800}
      groupKey="key"
      itemKey="id"
      groupHeaderHeight={44}
      groupHeaderRender={(group) => (
        <div style={{ padding: '0 16px', fontWeight: 600, background: '#f0f7ff' }}>
          {group.title}
        </div>
      )}
    >
      {(item) => (
        <div style={{ padding: 8, height: '100%', boxSizing: 'border-box' }}>
          <div style={{ background: '#fafafa', borderRadius: 8, height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.name}
          </div>
        </div>
      )}
    </GroupGrid>
  );
}
```

**Vue 3**

```vue
<script setup lang="ts">
import { GroupGrid } from 'react-virtual-youth/vue';
import type { GroupItem } from 'react-virtual-youth/vue';

interface Product { id: string; name: string }

const groups: GroupItem<Product>[] = [
  {
    key: 'electronics',
    title: '电子产品',
    children: Array.from({ length: 200 }, (_, i) => ({ id: `e${i}`, name: `电子 ${i}` })),
  },
];
</script>

<template>
  <GroupGrid
    :groups="groups"
    :height="500"
    :item-height="120"
    :column-count="4"
    :scroll-width="800"
    :group-header-height="44"
    group-key="key"
    item-key="id"
  >
    <!-- 自定义分组头部 -->
    <template #header="{ group, index }">
      <div style="padding: 0 16px; font-weight: 600; background: #f0f7ff; height: 100%; display: flex; align-items: center">
        {{ group.title }}
      </div>
    </template>

    <!-- 卡片 -->
    <template #default="{ item }">
      <div style="padding: 8px; height: 100%; box-sizing: border-box">
        <div style="background: #fafafa; border-radius: 8px; height: 100%;
          display: flex; align-items: center; justify-content: center">
          {{ item.name }}
        </div>
      </div>
    </template>
  </GroupGrid>
</template>
```

---

## 📋 API 参考

### List Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `data` | `T[]` | `[]` | 列表数据源 |
| `height` | `number` | — | **必填**。容器高度（px），决定可视区域 |
| `itemHeight` | `number` | — | **必填**。每行估算高度（px）。动态高度时作为初始占位高度 |
| `itemKey` | `string \| ((item: T) => Key)` | — | **必填**。唯一键，字符串时表示字段名 |
| `virtual` | `boolean` | `true` | 是否启用虚拟滚动；`false` 时渲染全量数据 |
| `fullHeight` | `boolean` | `true` | 容器是否设置固定高度（`height` px） |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | 文本方向，RTL 语言设为 `'rtl'` |
| `scrollWidth` | `number` | — | 启用横向滚动时的总宽度（px） |
| `showScrollBar` | `boolean \| 'optional'` | `'optional'` | 自定义滚动条显示策略：`true` 始终显示，`false` 隐藏，`'optional'` 悬停显示 |
| `onScroll` | `(e: Event) => void` | — | 原生 scroll 事件 |
| `onVirtualScroll` | `(info: ScrollInfo) => void` | — | 虚拟滚动位置变化回调，`info = { x, y }` |
| `onVisibleChange` | `(visible: T[], full: T[]) => void` | — | 可见项变化时触发，常用于数据预取 |
| `innerProps` | `InnerProps` | — | 透传给内层容器的额外属性 |
| `extraRender` | `(info: ExtraRenderInfo) => ReactNode \| VNode` | — | 在虚拟容器内追加额外内容（如固定行） |
| `styles` | `ScrollBarStyles` | — | 自定义滚动条样式，见[自定义滚动条样式](#自定义滚动条样式) |
| `class` | `string` | — | 容器 CSS 类名 |
| `style` | `CSSProperties` | — | 容器内联样式 |

> Vue 中事件以 `@on-virtual-scroll` / `@on-visible-change` 等形式绑定（`on` + 事件名）。

---

### Grid Props

继承 **List** 的所有属性，并新增：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `itemHeight` | `number` | — | **必填**。行高（px） |
| `itemWidth` | `number` | — | 每格宽度（px），与 `columnCount` 二选一 |
| `columnCount` | `number` | — | 固定列数，优先级高于 `itemWidth` / `columnWidth` |
| `columnWidth` | `number` | — | 列宽（px），与 `scrollWidth` 配合自动计算列数 |
| `scrollWidth` | `number` | — | 网格容器总宽度，用于计算自动列数 |
| `gap` | `number` | `0` | 格子间距（px），水平和垂直方向均生效，不含外边距 |

**列数计算逻辑**：

```
if (columnCount)  → 使用 columnCount
else if (columnWidth) → count = floor(scrollWidth / columnWidth)
else if (itemWidth)   → count = floor(scrollWidth / itemWidth)
else               → 默认 4 列
```

---

### GroupGrid Props

继承 **Grid** 的所有属性，并新增：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `groups` | `GroupItem<T>[]` | `[]` | 分组数据，替代 `data` |
| `groupKey` | `string \| ((group: GroupItem<T>) => Key)` | — | **必填**。分组唯一键 |
| `groupHeaderHeight` | `number` | `40` | 分组标题行高度（px） |
| `groupHeaderRender` | `(group, index) => ReactNode` | — | React：自定义标题渲染函数 |

Vue 通过具名插槽 `#header="{ group, index }"` 自定义分组标题。

**`GroupItem<T>` 类型**：

```ts
interface GroupItem<T> {
  key: string | number | symbol;  // 分组唯一标识
  title?: string;                 // 标题（可选，业务可自行扩展字段）
  children: T[];                  // 该分组的数据列表
}
```

---

### Ref 方法

通过 `ref` 获取组件实例后可调用：

```ts
interface ListRef {
  /** 根容器 DOM 元素 */
  nativeElement: HTMLDivElement;

  /** 程序化滚动 */
  scrollTo: ScrollTo;

  /** 获取当前滚动位置 */
  getScrollInfo: () => { x: number; y: number };
}

type ScrollTo = (arg?: number | ScrollConfig | null) => void;

/** 直接传数字 = 滚动到该 Y 偏移（px） */
listRef.current?.scrollTo(0);
listRef.current?.scrollTo(500);

/** 按索引定位 */
listRef.current?.scrollTo({ index: 100 });

/** 按 itemKey 的值定位 */
listRef.current?.scrollTo({ key: 'item-100' });

/** 指定对齐方式 */
listRef.current?.scrollTo({ index: 100, align: 'top' });    // 置顶
listRef.current?.scrollTo({ index: 100, align: 'bottom' }); // 置底
listRef.current?.scrollTo({ index: 100, align: 'auto' });   // 最小滚动量（默认）

/** 附加偏移量 */
listRef.current?.scrollTo({ index: 100, align: 'top', offset: 16 });
```

`GridRef` 和 `GroupGridRef` 拥有完全相同的接口。

---

### 类型定义

```ts
// 公共
type Key = string | number | symbol;

interface ScrollInfo {
  x: number;
  y: number;
}

interface ExtraRenderInfo {
  start: number;   // 当前虚拟范围起始索引
  end: number;     // 当前虚拟范围结束索引
  virtual: boolean;
  offsetX: number;
  offsetY: number;
  rtl: boolean;
  getSize: (startKey: Key, endKey?: Key) => { top: number; bottom: number };
}

// 滚动条自定义样式
interface ScrollBarStyles {
  horizontalScrollBar?: CSSProperties;
  horizontalScrollBarThumb?: CSSProperties;
  verticalScrollBar?: CSSProperties;
  verticalScrollBarThumb?: CSSProperties;
}
```

---

## 🔬 进阶用法

### 程序化滚动

**React**

```tsx
import { useRef } from 'react';
import List, { type ListRef } from 'react-virtual-youth';

export default function Demo() {
  const listRef = useRef<ListRef>(null);

  return (
    <>
      <button onClick={() => listRef.current?.scrollTo(0)}>回顶</button>
      <button onClick={() => listRef.current?.scrollTo({ index: 500, align: 'top' })}>第 500 条</button>
      <button onClick={() => listRef.current?.scrollTo({ key: 'item-888', align: 'auto' })}>按 Key 定位</button>

      <List ref={listRef} data={data} height={400} itemHeight={54} itemKey="id">
        {(item) => <div style={{ height: 54 }}>{item.text}</div>}
      </List>
    </>
  );
}
```

**Vue 3**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { List } from 'react-virtual-youth/vue';
import type { ListRef } from 'react-virtual-youth/vue';

const listRef = ref<ListRef | null>(null);
const goTop = () => listRef.value?.scrollTo(0);
const go500 = () => listRef.value?.scrollTo({ index: 500, align: 'top' });
</script>

<template>
  <button @click="goTop">回顶</button>
  <button @click="go500">第 500 条</button>

  <List ref="listRef" :data="data" :height="400" :item-height="54" item-key="id">
    <template #default="{ item }">
      <div style="height: 54px">{{ item.text }}</div>
    </template>
  </List>
</template>
```

---

### 动态高度

当列表项高度不固定时，`itemHeight` 作为初始占位高度，组件会在渲染后自动测量真实高度并更新布局。

```tsx
// React — 不固定高度示例
<List data={data} height={400} itemHeight={60} itemKey="id">
  {(item) => (
    // 每项实际高度可以不同
    <div style={{ padding: '12px 16px', minHeight: 40 }}>
      <p>{item.title}</p>
      {item.expanded && <p>{item.body}</p>}
    </div>
  )}
</List>
```

```vue
<!-- Vue — 不固定高度示例 -->
<List :data="data" :height="400" :item-height="60" item-key="id">
  <template #default="{ item }">
    <div style="padding: 12px 16px; min-height: 40px">
      <p>{{ item.title }}</p>
      <p v-if="item.expanded">{{ item.body }}</p>
    </div>
  </template>
</List>
```

> **注意**：动态高度依赖 `ResizeObserver` 测量元素，初次渲染时可能有轻微跳动，属正常现象。

---

### 水平滚动

传入 `scrollWidth` 使内容区域超出容器宽度，自动显示水平滚动条。

```tsx
// React
<List
  data={data}
  height={400}
  itemHeight={54}
  itemKey="id"
  scrollWidth={1200}  // 内容宽度 1200px，容器宽度由父元素决定
>
  {(item, _, { style, offsetX }) => (
    <div style={{ ...style, width: 1200, transform: `translateX(-${offsetX}px)` }}>
      {/* 宽内容 */}
    </div>
  )}
</List>
```

---

### RTL 支持

```tsx
// React
<List data={data} height={400} itemHeight={54} itemKey="id" direction="rtl">
  {(item) => <div style={{ height: 54, textAlign: 'right', padding: '0 16px' }}>{item.text}</div>}
</List>
```

```vue
<!-- Vue -->
<List :data="data" :height="400" :item-height="54" item-key="id" direction="rtl">
  <template #default="{ item }">
    <div style="height: 54px; text-align: right; padding: 0 16px">{{ item.text }}</div>
  </template>
</List>
```

---

### 自定义滚动条样式

```tsx
// React
<List
  data={data}
  height={400}
  itemHeight={54}
  itemKey="id"
  showScrollBar={true}
  styles={{
    verticalScrollBar: { background: 'rgba(0,0,0,0.04)', borderRadius: 4 },
    verticalScrollBarThumb: { background: '#1677ff', borderRadius: 4 },
  }}
>
  {(item) => <div style={{ height: 54 }}>{item.text}</div>}
</List>
```

---

## 🗂️ 与 Element Plus 集成

Element Plus 的 `el-table` 在数据量超过 5,000 行时性能会明显下降。  
使用本库的 `List` 作为表格虚拟体，可以在保持 `el-table` 视觉风格的同时，轻松支持 **50,000+** 行数据。

### 方案：固定表头 + 虚拟列表表体

核心思路是将表格拆成两层：
1. **固定表头**：普通的 flex div，列宽与表体对齐
2. **虚拟表体**：`List` 组件，每一行是一个 flex div

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { List } from 'react-virtual-youth/vue';
import type { ListRef } from 'react-virtual-youth/vue';

interface Row {
  id: number;
  name: string;
  department: string;
  salary: number;
  status: 'active' | 'leave';
}

const ROW_HEIGHT = 48;

// 列定义
const columns = [
  { key: 'id',         label: 'ID',   width: 80,  align: 'right'  },
  { key: 'name',       label: '姓名', width: 120, align: 'left'   },
  { key: 'department', label: '部门', width: 120, align: 'left'   },
  { key: 'salary',     label: '薪资', width: 100, align: 'right'  },
  { key: 'status',     label: '状态', width: 90,  align: 'center' },
] as const;

// 50,000 条数据
const data = Array.from<unknown, Row>({ length: 50000 }, (_, i) => ({
  id: i + 1,
  name: `员工 ${i + 1}`,
  department: ['技术部', '产品部', '设计部'][i % 3],
  salary: 8000 + (i % 10) * 1000,
  status: i % 5 === 0 ? 'leave' : 'active',
}));

const listRef = ref<ListRef | null>(null);
const jumpId = ref(1);
function scrollToId() {
  const index = data.findIndex((r) => r.id === jumpId.value);
  if (index >= 0) listRef.value?.scrollTo({ index, align: 'top' });
}
</script>

<template>
  <!-- 跳转控件 -->
  <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center">
    <el-input-number v-model="jumpId" :min="1" :max="50000" style="width: 140px" />
    <el-button type="primary" @click="scrollToId">定位到 ID</el-button>
    <span style="font-size: 13px; color: #8c8c8c">共 50,000 行</span>
  </div>

  <!-- 表格容器 -->
  <div style="border: 1px solid #ebeef5; border-radius: 4px; overflow: hidden">

    <!-- ① 固定表头 -->
    <div style="display: flex; background: #f5f7fa; border-bottom: 1px solid #ebeef5;
                font-size: 12px; font-weight: 600; color: #909399">
      <div
        v-for="col in columns"
        :key="col.key"
        :style="{
          width: `${col.width}px`,
          flexShrink: 0,
          padding: '12px 8px',
          textAlign: col.align,
        }"
      >
        {{ col.label }}
      </div>
    </div>

    <!-- ② 虚拟表体 -->
    <List
      ref="listRef"
      :data="data"
      :height="480"
      :item-height="ROW_HEIGHT"
      item-key="id"
    >
      <template #default="{ item, index }">
        <div
          :style="{
            display: 'flex',
            alignItems: 'center',
            height: `${ROW_HEIGHT}px`,
            borderBottom: '1px solid #f2f6fc',
            background: index % 2 === 0 ? '#fff' : '#fafafa',
            fontSize: '13px',
            color: '#606266',
            boxSizing: 'border-box',
          }"
        >
          <div style="width: 80px; flex-shrink: 0; padding: 0 8px; text-align: right">{{ item.id }}</div>
          <div style="width: 120px; flex-shrink: 0; padding: 0 8px">{{ item.name }}</div>
          <div style="width: 120px; flex-shrink: 0; padding: 0 8px">{{ item.department }}</div>
          <div style="width: 100px; flex-shrink: 0; padding: 0 8px; text-align: right">
            ¥{{ item.salary.toLocaleString() }}
          </div>
          <div style="width: 90px; flex-shrink: 0; padding: 0 8px; text-align: center">
            <el-tag :type="item.status === 'active' ? 'success' : 'warning'" size="small">
              {{ item.status === 'active' ? '在职' : '休假' }}
            </el-tag>
          </div>
        </div>
      </template>
    </List>
  </div>
</template>
```

### 与 el-table-v2 的对比

| 特性 | 本库（VirtualList） | Element Plus el-table-v2 |
|------|-------------------|--------------------------|
| 数据量 | 50,000+ | 100,000+ |
| 动态行高 | ✅ 自动测量 | ⚠️ 需手动指定 `estimatedRowHeight` |
| 固定列 | 手动实现 | ✅ 内置 |
| 树形数据 | 手动实现 | ✅ 内置 |
| 分组表头 | 手动实现 | ✅ 内置 |
| 定制自由度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 与业务逻辑集成 | 灵活 | 受限于 API |

**建议**：
- 需要固定列、多级表头等复杂功能 → 优先使用 `el-table-v2`
- 需要高度自定义的虚拟表格（如单元格内嵌组件、复杂交互） → 使用本库

---

## 🔄 Vue 与 React API 差异

两者 API 设计一致，但受框架约定影响有以下差异：

| 特性 | React | Vue 3 |
|------|-------|-------|
| 导入路径 | `react-virtual-youth` 或 `react-virtual-youth/react` | `react-virtual-youth/vue` |
| 子内容渲染 | render prop（children 函数） | 默认插槽 `#default="{ item, index, style }"` |
| 分组标题渲染 | `groupHeaderRender` prop | 具名插槽 `#header="{ group, index }"` |
| 额外渲染 | `extraRender` prop | `extraRender` prop（返回 VNode） |
| 事件名 | `onVirtualScroll`、`onVisibleChange` | `@on-virtual-scroll`、`@on-visible-change` |
| Ref | `useRef<ListRef>()` + `ref={listRef}` | `ref<ListRef \| null>(null)` + `ref="listRef"` |
| Props 命名 | camelCase：`itemHeight`、`columnCount` | kebab-case：`item-height`、`column-count` |

### Vue 插槽参数说明

```vue
<!-- List / Grid / GroupGrid 默认插槽 -->
<template #default="{ item, index, style, offsetX }">
  <!--
    item:    当前数据项
    index:   数据项在原始数组中的索引
    style:   由 VirtualList 计算的定位样式（position/transform/height）
    offsetX: 水平滚动偏移量（仅启用 scrollWidth 时有效）
  -->
</template>

<!-- GroupGrid 分组标题插槽 -->
<template #header="{ group, index }">
  <!--
    group: GroupItem 对象（含 key、title、children 及业务扩展字段）
    index: 分组在 groups 数组中的索引
  -->
</template>
```

---

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/your-org/react-virtual-youth.git
cd react-virtual-youth

# 安装依赖
pnpm install

# 开发模式（watch，同时编译 React 和 Vue 产物）
pnpm run dev

# 构建
pnpm run build

# 运行测试
pnpm run test

# 代码格式化
pnpm run format

# Lint 检查
pnpm run check
```

### 运行 Demo Playground

项目内置了一个基于 Vite 的 Playground，包含 Vue 全部 demo 和 Element Plus 集成示例：

```bash
# 安装 playground 依赖（仅首次）
cd playground && pnpm install

# 启动开发服务器
pnpm dev
# 浏览器打开 http://localhost:5173
```

或在根目录执行：

```bash
pnpm playground
```

Playground 通过 Vite alias 直接映射到 `src/vue/index.ts` 源码，**无需提前 build 库**，修改源码后即时热更新。

**目录结构**

```
src/
├── react/            # React 适配层（hooks + JSX 组件）
│   ├── hooks/
│   ├── List.tsx
│   ├── Grid.tsx
│   ├── GroupGrid.tsx
│   └── index.ts
├── vue/              # Vue 3 适配层（composables + h() 组件）
│   ├── composables/
│   ├── List.ts
│   ├── Grid.ts
│   ├── GroupGrid.ts
│   └── index.ts
└── utils/            # 框架无关的核心算法
    ├── CacheMap.ts
    ├── algorithmUtil.ts
    ├── scrollbarUtil.ts
    └── ...

dist/
├── react/            # React 构建产物（unbundled）
└── vue/              # Vue 构建产物（bundled single file）

demo/
├── list-demo.tsx             # React List 演示
├── grid-demo.tsx             # React Grid 演示
├── vue-list-demo.vue         # Vue List 演示
├── vue-grid-demo.vue         # Vue Grid 演示
├── vue-group-grid-demo.vue   # Vue GroupGrid 演示
└── vue-element-plus-table-demo.vue  # Vue + Element Plus 虚拟表格
```

---

## 📄 许可证

[MIT](./LICENSE) © react-virtual-youth contributors

---

## 🙏 鸣谢

本项目基于 [rc-virtual-list](https://github.com/react-component/virtual-list) 进行开发，感谢原作者的贡献。
