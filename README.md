# virtual-scroll

<p align="center">
  <strong>高性能的虚拟滚动列表/网格组件，支持React</strong>
</p>

<p align="center">
  <a href="#readme" title="版本">
    <img src="https://img.shields.io/npm/v/virtual-scroll.svg?style=flat-square" alt="npm version" />
  </a>
  <a href="#readme" title="许可证">
    <img src="https://img.shields.io/npm/l/virtual-scroll.svg?style=flat-square" alt="license" />
  </a>
  <a href="#readme" title="下载量">
    <img src="https://img.shields.io/npm/dm/virtual-scroll.svg?style=flat-square" alt="downloads" />
  </a>
</p>

## 🚀 特性

- 🏎️ **高性能**: 使用虚拟滚动技术，仅渲染可见区域的元素，支持大量数据的流畅滚动
- 🧩 **多种布局**: 支持 List（列表）、Grid（网格）、GroupGrid（分组网格）三种布局模式
- 📱 **响应式**: 支持触摸设备，提供流畅的滚动体验
- 🎨 **可定制**: 丰富的配置选项和样式定制能力
- 🔄 **滚动控制**: 支持程序化滚动到指定位置
- 🖱️ **交互支持**: 支持鼠标拖拽滚动和滚轮滚动
- 🌐 **国际化**: 支持RTL布局

## 📦 安装

```bash
npm install @webyouth/virtual-scroll
```

或者

```bash
yarn add @webyouth/virtual-scroll
```

或者

```bash
pnpm add @webyouth/virtual-scroll
```

## 🔧 使用方法

### 基础列表

```jsx
import React from 'react';
import List from 'mfy-virtual-list';

const BasicList = () => {
  const data = Array.from({ length: 10000 }, (_, index) => ({
    id: index,
    content: `Item ${index}`,
  }));

  return (
    <List
      data={data}
      height={400}
      itemHeight={60}
      itemKey="id"
      onVisibleChange={(visibleList, fullList) => {
        console.log('Visible items:', visibleList);
      }}
    >
      {(item, index) => (
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #eee',
            padding: '0 16px',
            backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
          }}
        >
          {item.content}
        </div>
      )}
    </List>
  );
};

export default BasicList;
```

### 网格布局

```jsx
import React from 'react';
import Grid from 'mfy-virtual-list';

const GridExample = () => {
  const data = Array.from({ length: 10000 }, (_, index) => ({
    id: index,
    content: `Item ${index}`,
  }));

  return (
    <Grid
      data={data}
      height={400}
      itemHeight={100}
      itemWidth={200}
      columnCount={4}
      itemKey="id"
    >
      {(item, index) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #eee',
            margin: 4,
            borderRadius: 4,
          }}
        >
          {item.content}
        </div>
      )}
    </Grid>
  );
};

export default GridExample;
```

### 分组网格

```jsx
import React from 'react';
import GroupGrid from 'mfy-virtual-list';

const GroupGridExample = () => {
  const groups = [
    {
      key: 'group1',
      title: 'Group 1',
      children: Array.from({ length: 50 }, (_, index) => ({
        id: `g1-${index}`,
        content: `Group 1 - Item ${index}`,
      })),
    },
    {
      key: 'group2',
      title: 'Group 2',
      children: Array.from({ length: 50 }, (_, index) => ({
        id: `g2-${index}`,
        content: `Group 2 - Item ${index}`,
      })),
    },
  ];

  return (
    <GroupGrid
      groups={groups}
      height={500}
      itemHeight={100}
      itemWidth={200}
      columnCount={3}
      groupKey="key"
      itemKey="id"
      groupHeaderHeight={40}
    >
      {(item, index) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #eee',
            margin: 4,
            borderRadius: 4,
          }}
        >
          {item.content}
        </div>
      )}
    </GroupGrid>
  );
};

export default GroupGridExample;
```

## 📋 API

### List 组件

| 属性 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `data` | `T[]` | - | 列表数据 |
| `height` | `number` | - | 列表容器高度 |
| `itemHeight` | `number` | - | 每项的高度 |
| `itemKey` | `Key \| (item: T) => Key` | - | 每项的唯一标识 |
| `virtual` | `boolean` | `true` | 是否启用虚拟滚动 |
| `fullHeight` | `boolean` | `true` | 是否设置容器固定高度 |
| `component` | `string \| FC \| ComponentClass` | `'div'` | 容器组件 |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | 滚动方向 |
| `scrollWidth` | `number` | - | 滚动宽度(启用水平滚动) |
| `onScroll` | `UIEventHandler` | - | 滚动事件回调 |
| `onVirtualScroll` | `(info: ScrollInfo) => void` | - | 虚拟滚动事件回调 |
| `onVisibleChange` | `(visibleList: T[], fullList: T[]) => void` | - | 可见项变化回调 |
| `innerProps` | `InnerProps` | - | 内部容器属性 |
| `extraRender` | `(info: ExtraRenderInfo) => ReactNode` | - | 额外渲染内容 |

### Grid 组件

Grid 组件具有 List 组件的所有属性，并额外支持：

| 属性 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `itemWidth` | `number` | - | 每项的宽度 |
| `columnCount` | `number` | - | 列数 |
| `columnWidth` | `number` | - | 每列的宽度 |

### GroupGrid 组件

GroupGrid 组件具有 Grid 组件的所有属性，并额外支持：

| 属性 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `groups` | `GroupItem<T>[]` | - | 分组数据 |
| `groupKey` | `Key \| (group: GroupItem<T>) => Key` | - | 分组的唯一标识 |
| `groupHeaderHeight` | `number` | `40` | 分组头部高度 |
| `groupHeaderRender` | `(group: GroupItem<T>, index: number) => ReactNode` | - | 自定义分组头部渲染 |

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 构建
pnpm run build

# 运行测试
pnpm run test

# 格式化代码
pnpm run format

# 检查代码
pnpm run check
```

## 🤝 贡献

欢迎贡献！请先 fork 仓库，然后提交 pull request。

## 📄 许可证

MIT License。详见 [LICENSE](./LICENSE) 文件。

## 🙏 鸣谢

本项目基于 rc-virtual-list 进行开发，感谢原作者的贡献！