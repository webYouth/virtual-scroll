import raf from '@rc-component/util/lib/raf';
import { ref, watchPostEffect, type Ref } from 'vue';
import type CacheMap from '../../utils/CacheMap';
import type { GetKey } from '../interface';

const MAX_TIMES = 10;

export type ScrollAlign = 'top' | 'bottom' | 'auto';

export type ScrollPos = {
  left?: number;
  top?: number;
};

export type ScrollTarget =
  | { index: number; align?: ScrollAlign; offset?: number }
  | { key: string | number | symbol; align?: ScrollAlign; offset?: number };

interface SyncState {
  times: number;
  index: number;
  offset: number;
  originAlign: ScrollAlign;
  targetAlign?: 'top' | 'bottom';
  lastTop?: number;
}

export function useScrollTo<T>(
  containerRef: Ref<HTMLDivElement | null>,
  getData: () => T[],
  heights: CacheMap,
  getItemHeight: () => number,
  getKey: GetKey<T>,
  collectHeight: () => void,
  syncScrollTop: (newTop: number) => void,
  triggerFlash: () => void,
) {
  const scrollRafRef = ref<number | null>(null);
  const syncState = ref<SyncState | null>(null);

  watchPostEffect(() => {
    const state = syncState.value;
    if (!state) return;

    if (state.times >= MAX_TIMES) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          'Seems `scrollTo` with virtual list reached the max limitation. Please file an issue.',
        );
      }
      return;
    }

    const container = containerRef.value;
    if (!container) {
      syncState.value = { ...state };
      return;
    }

    collectHeight();

    const { targetAlign, originAlign, index, offset } = state;
    const containerHeight = container.clientHeight;
    let needCollectHeight = false;
    let newTargetAlign: 'top' | 'bottom' | null = targetAlign ?? null;
    let targetTop: number | null = null;

    if (containerHeight) {
      const mergedAlign = targetAlign || originAlign;
      const data = getData();
      const itemHeight = getItemHeight();

      let stackTop = 0;
      let itemTop = 0;
      let itemBottom = 0;

      const maxLen = Math.min(data.length - 1, index);
      for (let i = 0; i <= maxLen; i++) {
        const key = getKey(data[i]);
        itemTop = stackTop;
        const cacheHeight = heights.get(key);
        itemBottom = itemTop + (cacheHeight === undefined ? itemHeight : cacheHeight);
        stackTop = itemBottom;
      }

      let leftHeight = mergedAlign === 'top' ? offset : containerHeight - offset;
      for (let i = maxLen; i >= 0; i--) {
        const key = getKey(data[i]);
        const cacheHeight = heights.get(key);
        if (cacheHeight === undefined) {
          needCollectHeight = true;
          break;
        }
        leftHeight -= cacheHeight;
        if (leftHeight <= 0) break;
      }

      switch (mergedAlign) {
        case 'top':
          targetTop = itemTop - offset;
          break;
        case 'bottom':
          targetTop = itemBottom - containerHeight + offset;
          break;
        default: {
          const { scrollTop } = container;
          const scrollBottom = scrollTop + containerHeight;
          if (itemTop < scrollTop) {
            newTargetAlign = 'top';
          } else if (itemBottom > scrollBottom) {
            newTargetAlign = 'bottom';
          }
        }
      }

      if (targetTop !== null) {
        syncScrollTop(targetTop);
      }

      if (targetTop !== state.lastTop) {
        needCollectHeight = true;
      }
    }

    if (needCollectHeight) {
      syncState.value = {
        ...state,
        times: state.times + 1,
        targetAlign: newTargetAlign ?? undefined,
        lastTop: targetTop ?? undefined,
      };
    } else {
      syncState.value = null;
    }
  });

  function scrollTo(arg: number | ScrollTarget) {
    if (arg === null || arg === undefined) {
      triggerFlash();
      return;
    }

    if (scrollRafRef.value !== null) {
      raf.cancel(scrollRafRef.value);
    }

    if (typeof arg === 'number') {
      syncScrollTop(arg);
    } else if (arg && typeof arg === 'object') {
      const data = getData();
      let index: number;
      const { align } = arg;

      if ('index' in arg) {
        index = arg.index;
      } else {
        index = data.findIndex((item) => getKey(item) === (arg as { key: string | number | symbol }).key);
      }

      const { offset = 0 } = arg;

      syncState.value = {
        times: 0,
        index,
        offset,
        originAlign: align ?? 'auto',
      };
    }
  }

  return scrollTo;
}
