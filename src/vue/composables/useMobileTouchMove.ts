import { onMounted, onUnmounted, type Ref } from 'vue';

const SMOOTH_PTG = 14 / 15;

export function useMobileTouchMove(
  getInVirtual: () => boolean,
  listRef: Ref<HTMLDivElement | null>,
  callback: (
    isHorizontal: boolean,
    offset: number,
    smoothOffset: boolean,
    e?: TouchEvent,
  ) => boolean,
) {
  let touchedRef = false;
  let touchXRef = 0;
  let touchYRef = 0;
  let elementRef: HTMLElement | null = null;
  let intervalRef: ReturnType<typeof setInterval> | null = null;

  let cleanUpEvents: () => void;

  const onTouchMove = (e: TouchEvent) => {
    if (touchedRef) {
      const currentX = Math.ceil(e.touches[0].pageX);
      const currentY = Math.ceil(e.touches[0].pageY);
      let offsetX = touchXRef - currentX;
      let offsetY = touchYRef - currentY;
      const isHorizontal = Math.abs(offsetX) > Math.abs(offsetY);

      if (isHorizontal) {
        touchXRef = currentX;
      } else {
        touchYRef = currentY;
      }

      const scrollHandled = callback(isHorizontal, isHorizontal ? offsetX : offsetY, false, e);
      if (scrollHandled) {
        e.preventDefault();
      }

      if (intervalRef !== null) clearInterval(intervalRef);

      if (scrollHandled) {
        intervalRef = setInterval(() => {
          if (isHorizontal) {
            offsetX *= SMOOTH_PTG;
          } else {
            offsetY *= SMOOTH_PTG;
          }
          const offset = Math.floor(isHorizontal ? offsetX : offsetY);
          if (!callback(isHorizontal, offset, true) || Math.abs(offset) <= 0.1) {
            if (intervalRef !== null) clearInterval(intervalRef);
          }
        }, 16);
      }
    }
  };

  const onTouchEnd = () => {
    touchedRef = false;
    cleanUpEvents();
  };

  const onTouchStart = (e: TouchEvent) => {
    cleanUpEvents();

    if (e.touches.length === 1 && !touchedRef) {
      touchedRef = true;
      touchXRef = Math.ceil(e.touches[0].pageX);
      touchYRef = Math.ceil(e.touches[0].pageY);

      elementRef = e.target as HTMLElement;
      elementRef.addEventListener('touchmove', onTouchMove, { passive: false });
      elementRef.addEventListener('touchend', onTouchEnd, { passive: true });
    }
  };

  cleanUpEvents = () => {
    if (elementRef) {
      elementRef.removeEventListener('touchmove', onTouchMove);
      elementRef.removeEventListener('touchend', onTouchEnd);
    }
  };

  onMounted(() => {
    const el = listRef.value;
    if (getInVirtual() && el) {
      el.addEventListener('touchstart', onTouchStart, { passive: true });
    }
  });

  onUnmounted(() => {
    const el = listRef.value;
    el?.removeEventListener('touchstart', onTouchStart);
    cleanUpEvents();
    if (intervalRef !== null) clearInterval(intervalRef);
  });

  // Return re-register function for when inVirtual changes
  return {
    register(el: HTMLElement) {
      el.addEventListener('touchstart', onTouchStart, { passive: true });
    },
    unregister(el: HTMLElement) {
      el.removeEventListener('touchstart', onTouchStart);
      cleanUpEvents();
      if (intervalRef !== null) clearInterval(intervalRef);
    },
  };
}
