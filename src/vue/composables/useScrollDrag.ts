import raf from '@rc-component/util/lib/raf';

export function getPageXY(
  e: MouseEvent | TouchEvent,
  horizontal: boolean,
) {
  const obj = 'touches' in e ? e.touches[0] : e;
  return obj[horizontal ? 'pageX' : 'pageY'] - window[horizontal ? 'scrollX' : 'scrollY'];
}

function smoothScrollOffset(offset: number) {
  return Math.floor(offset ** 0.5);
}

export function useScrollDrag(
  getInVirtual: () => boolean,
  getElement: () => HTMLElement | null,
  onScrollOffset: (offset: number) => void,
) {
  let mouseDownLock = false;
  let rafId: number | null = null;
  let offset = 0;

  const stopScroll = () => {
    if (rafId !== null) raf.cancel(rafId);
  };

  const continueScroll = () => {
    stopScroll();
    rafId = raf(() => {
      onScrollOffset(offset);
      continueScroll();
    });
  };

  const clearDragState = () => {
    mouseDownLock = false;
    stopScroll();
  };

  const onMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).draggable || e.button !== 0) return;

    const event = e as MouseEvent & { _virtualHandled?: boolean };
    if (!event._virtualHandled) {
      event._virtualHandled = true;
      mouseDownLock = true;
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!mouseDownLock) return;

    const ele = getElement();
    if (!ele) return;

    const mouseY = getPageXY(e, false);
    const { top, bottom } = ele.getBoundingClientRect();

    if (mouseY <= top) {
      const diff = top - mouseY;
      offset = -smoothScrollOffset(diff);
      continueScroll();
    } else if (mouseY >= bottom) {
      const diff = mouseY - bottom;
      offset = smoothScrollOffset(diff);
      continueScroll();
    } else {
      stopScroll();
    }
  };

  function register() {
    const ele = getElement();
    if (!getInVirtual() || !ele) return;

    ele.addEventListener('mousedown', onMouseDown);
    ele.ownerDocument.addEventListener('mouseup', clearDragState);
    ele.ownerDocument.addEventListener('mousemove', onMouseMove);
    ele.ownerDocument.addEventListener('dragend', clearDragState);
  }

  function unregister() {
    const ele = getElement();
    if (!ele) return;

    ele.removeEventListener('mousedown', onMouseDown);
    ele.ownerDocument.removeEventListener('mouseup', clearDragState);
    ele.ownerDocument.removeEventListener('mousemove', onMouseMove);
    ele.ownerDocument.removeEventListener('dragend', clearDragState);
    stopScroll();
  }

  return { register, unregister };
}
