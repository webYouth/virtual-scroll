import { shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import { findListDiffIndex } from '../../utils/algorithmUtil';
import type { GetKey } from '../interface';

export function useDiffItem<T>(
  data: Ref<T[]>,
  getKey: GetKey<T>,
): ShallowRef<T | null> {
  const diffItem = shallowRef<T | null>(null);
  let prevData: T[] = data.value;

  watch(data, (newData) => {
    const diff = findListDiffIndex(prevData || [], newData || [], getKey);
    if (diff?.index !== undefined) {
      diffItem.value = newData[diff.index] as T;
    }
    prevData = newData;
  });

  return diffItem;
}
