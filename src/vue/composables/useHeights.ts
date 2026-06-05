import { onUnmounted, ref } from 'vue';
import CacheMap from '../../utils/CacheMap';
import type { GetKey, Key } from '../interface';

function parseNumber(value: string) {
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}

export function useHeights<T>(getKey: GetKey<T>) {
  const updatedMark = ref(0);
  const instanceMap = new Map<Key, HTMLElement>();
  const heights = new CacheMap();
  let promiseId = 0;

  function cancelRaf() {
    promiseId += 1;
  }

  function collectHeight(sync = false) {
    cancelRaf();

    const doCollect = () => {
      let changed = false;

      instanceMap.forEach((element, key) => {
        if (element && element.offsetParent) {
          const { offsetHeight } = element;
          const { marginTop, marginBottom } = getComputedStyle(element);
          const marginTopNum = parseNumber(marginTop);
          const marginBottomNum = parseNumber(marginBottom);
          const totalHeight = offsetHeight + marginTopNum + marginBottomNum;

          if (heights.get(key) !== totalHeight) {
            heights.set(key, totalHeight);
            changed = true;
          }
        }
      });

      if (changed) {
        updatedMark.value += 1;
      }
    };

    if (sync) {
      doCollect();
    } else {
      promiseId += 1;
      const id = promiseId;
      Promise.resolve().then(() => {
        if (id === promiseId) {
          doCollect();
        }
      });
    }
  }

  function setInstanceRef(item: T, instance: HTMLElement | null) {
    const key = getKey(item);

    if (instance) {
      instanceMap.set(key, instance);
      collectHeight();
    } else {
      instanceMap.delete(key);
    }
  }

  onUnmounted(() => {
    cancelRaf();
  });

  return { setInstanceRef, collectHeight, heights, updatedMark };
}
