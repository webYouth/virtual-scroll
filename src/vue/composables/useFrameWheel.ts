import raf from '@rc-component/util/lib/raf';
import isFF from '../../utils/isFirefox';
import { useOriginScroll } from './useOriginScroll';

interface FireFoxDOMMouseScrollEvent {
  detail: number;
  preventDefault: VoidFunction;
}

export function useFrameWheel(
  getInVirtual: () => boolean,
  getIsScrollAtTop: () => boolean,
  getIsScrollAtBottom: () => boolean,
  getIsScrollAtLeft: () => boolean,
  getIsScrollAtRight: () => boolean,
  horizontalScroll: boolean,
  onWheelDelta: (offset: number, horizontal: boolean) => void,
): [(e: WheelEvent) => void, (e: FireFoxDOMMouseScrollEvent) => void] {
  const originScroll = useOriginScroll(
    getIsScrollAtTop,
    getIsScrollAtBottom,
    getIsScrollAtLeft,
    getIsScrollAtRight,
  );

  let offsetRef = 0;
  let nextFrameRef: number | null = null;
  let wheelValueRef: number | null = null;
  let isMouseScrollRef = false;
  let wheelDirectionRef: 'x' | 'y' | 'sx' | null = null;
  let wheelDirectionCleanRef: number | null = null;

  function onWheelY(e: WheelEvent, deltaY: number) {
    if (nextFrameRef !== null) raf.cancel(nextFrameRef);

    if (originScroll(false, deltaY)) return;

    const event = e as WheelEvent & { _virtualHandled?: boolean };
    if (!event._virtualHandled) {
      event._virtualHandled = true;
    } else {
      return;
    }

    offsetRef += deltaY;
    wheelValueRef = deltaY;

    if (!isFF) {
      event.preventDefault();
    }

    nextFrameRef = raf(() => {
      const patchMultiple = isMouseScrollRef ? 10 : 1;
      onWheelDelta(offsetRef * patchMultiple, false);
      offsetRef = 0;
    });
  }

  function onWheelX(event: WheelEvent, deltaX: number) {
    onWheelDelta(deltaX, true);
    if (!isFF) {
      event.preventDefault();
    }
  }

  function onWheel(event: WheelEvent) {
    if (!getInVirtual()) return;

    if (wheelDirectionCleanRef !== null) raf.cancel(wheelDirectionCleanRef);
    wheelDirectionCleanRef = raf(() => {
      wheelDirectionRef = null;
    }, 2);

    const { deltaX, deltaY, shiftKey } = event;
    let mergedDeltaX = deltaX;
    let mergedDeltaY = deltaY;

    if (
      wheelDirectionRef === 'sx' ||
      (!wheelDirectionRef && (shiftKey || false) && deltaY && !deltaX)
    ) {
      mergedDeltaX = deltaY;
      mergedDeltaY = 0;
      wheelDirectionRef = 'sx';
    }

    const absX = Math.abs(mergedDeltaX);
    const absY = Math.abs(mergedDeltaY);

    if (wheelDirectionRef === null) {
      wheelDirectionRef = horizontalScroll && absX > absY ? 'x' : 'y';
    }

    if (wheelDirectionRef === 'y') {
      onWheelY(event, mergedDeltaY);
    } else {
      onWheelX(event, mergedDeltaX);
    }
  }

  function onFireFoxScroll(event: FireFoxDOMMouseScrollEvent) {
    if (!getInVirtual()) return;
    isMouseScrollRef = event.detail === wheelValueRef;
  }

  return [onWheel, onFireFoxScroll];
}
