import { computed, type ComputedRef, type Ref } from 'vue';
import type CacheMap from '../../utils/CacheMap';
import type { GetKey, GetSize, Key } from '../interface';

/**
 * Size info needs loop query on `heights` which has perf implications.
 * Cache results per computed dependency to avoid repeated loops.
 */
export function useGetSize<T>(
  mergedData: Ref<T[]>,
  getKey: GetKey<T>,
  heights: CacheMap,
  itemHeight: Ref<number>,
): ComputedRef<GetSize> {
  return computed(() => {
    const key2Index = new Map<Key, number>();
    const bottomList: number[] = [];

    const getSize: GetSize = (startKey, endKey = startKey) => {
      let startIndex = key2Index.get(startKey);
      let endIndex = key2Index.get(endKey);

      if (startIndex === undefined || endIndex === undefined) {
        const dataLen = mergedData.value.length;
        for (let i = bottomList.length; i < dataLen; i++) {
          const item = mergedData.value[i];
          const key = getKey(item);
          key2Index.set(key, i);
          const cacheHeight = heights.get(key) ?? itemHeight.value;
          bottomList[i] = (bottomList[i - 1] || 0) + cacheHeight;

          if (key === startKey) startIndex = i;
          if (key === endKey) endIndex = i;

          if (startIndex !== undefined && endIndex !== undefined) break;
        }
      }

      return {
        top: bottomList[(startIndex as number) - 1] || 0,
        bottom: bottomList[endIndex as number],
      };
    };

    return getSize;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
}
