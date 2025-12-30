import raf from '@rc-component/util/lib/raf';
import { clsx } from 'clsx';
import {
  type CSSProperties,
  forwardRef,
  type MouseEventHandler,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getPageXY } from './hooks/useScrollDrag';

export type ScrollBarDirectionType = 'ltr' | 'rtl';

export interface ScrollBarProps {
  prefixCls: string;
  scrollOffset: number;
  scrollRange: number;
  rtl: boolean;
  onScroll: (scrollOffset: number, horizontal?: boolean) => void;
  onStartMove: () => void;
  onStopMove: () => void;
  horizontal?: boolean;
  style?: CSSProperties;
  thumbStyle?: CSSProperties;
  spinSize: number;
  containerSize: number;
  showScrollBar?: boolean | 'optional';
}

export interface ScrollBarRef {
  delayHidden: () => void;
}

const ScrollBar = forwardRef<ScrollBarRef, ScrollBarProps>((props, ref) => {
  const {
    prefixCls,
    rtl,
    scrollOffset,
    scrollRange,
    onStartMove,
    onStopMove,
    onScroll,
    horizontal,
    spinSize,
    containerSize,
    style,
    thumbStyle: propsThumbStyle,
    showScrollBar,
  } = props;

  const [dragging, setDragging] = useState(false);
  const [pageXY, setPageXY] = useState<number | null>(null);
  const [startTop, setStartTop] = useState<number | null>(null);

  const isLTR = !rtl;

  // ========================= Refs =========================
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // ======================= Visible ========================
  const [visible, setVisible] = useState(showScrollBar);
  const visibleTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const delayHidden = () => {
    if (showScrollBar === true || showScrollBar === false) return;
		if (visibleTimeoutRef.current) {
			clearTimeout(visibleTimeoutRef.current);
		}
    setVisible(true);
    visibleTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 3000);
  };

  // ======================== Range =========================
  const enableScrollRange = scrollRange - containerSize || 0;
  const enableOffsetRange = containerSize - spinSize || 0;

  // ========================= Top ==========================
  const top = useMemo(() => {
    if (scrollOffset === 0 || enableScrollRange === 0) {
      return 0;
    }
    const ptg = scrollOffset / enableScrollRange;
    return ptg * enableOffsetRange;
  }, [scrollOffset, enableScrollRange, enableOffsetRange]);

  // ====================== Container =======================
  const onContainerMouseDown: MouseEventHandler = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // ======================== Thumb =========================
  const stateRef = useRef({ top, dragging, pageY: pageXY, startTop });
  stateRef.current = { top, dragging, pageY: pageXY, startTop };

  const onThumbMouseDown = (e: MouseEvent | TouchEvent | TouchEvent) => {
    setDragging(true);
    setPageXY(getPageXY(e, horizontal ?? false));
    setStartTop(stateRef.current.top);

    onStartMove();
    e.stopPropagation();
    e.preventDefault();
  };

  // ======================== Effect ========================

  // React make event as passive, but we need to preventDefault
  // Add event on dom directly instead.
  // ref: https://github.com/facebook/react/issues/9809
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const onScrollbarTouchStart = (e: TouchEvent) => {
      e.preventDefault();
    };

    const scrollbarEle = scrollbarRef.current;
    const thumbEle = thumbRef.current;
    scrollbarEle?.addEventListener('touchstart', onScrollbarTouchStart, {
      passive: false,
    });
    thumbEle?.addEventListener('touchstart', onThumbMouseDown, {
      passive: false,
    });

    return () => {
      scrollbarEle?.removeEventListener('touchstart', onScrollbarTouchStart);
      thumbEle?.removeEventListener('touchstart', onThumbMouseDown);
    };
  }, []);

  // Pass to effect
  const enableScrollRangeRef = useRef<number>(null);
  enableScrollRangeRef.current = enableScrollRange;
  const enableOffsetRangeRef = useRef<number>(null);
  enableOffsetRangeRef.current = enableOffsetRange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (dragging) {
      let moveRafId: number;

      const onMouseMove = (e: MouseEvent | TouchEvent) => {
        const {
          dragging: stateDragging,
          pageY: statePageY,
          startTop: stateStartTop,
        } = stateRef.current;
        raf.cancel(moveRafId);

        const rect = scrollbarRef.current?.getBoundingClientRect();
        const scale = containerSize / (horizontal ? rect?.width ?? 0 : rect?.height ?? 0);

        if (stateDragging) {
          const offset = (getPageXY(e, horizontal ?? false) - (statePageY ?? 0)) * scale;
          let newTop = stateStartTop ?? 0;

          if (!isLTR && horizontal) {
            newTop -= offset;
          } else {
            newTop += offset;
          }

          const tmpEnableScrollRange = enableScrollRangeRef.current;
          const tmpEnableOffsetRange = enableOffsetRangeRef.current;

          const ptg: number = tmpEnableOffsetRange
            ? newTop / tmpEnableOffsetRange
            : 0;

          let newScrollTop = Math.ceil(ptg * (tmpEnableScrollRange ?? 0));
          newScrollTop = Math.max(newScrollTop, 0);
          newScrollTop = Math.min(newScrollTop, tmpEnableScrollRange ?? 0);

          moveRafId = raf(() => {
            onScroll(newScrollTop, horizontal);
          });
        }
      };

      const onMouseUp = () => {
        setDragging(false);

        onStopMove();
      };

      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('touchmove', onMouseMove, { passive: true });
      window.addEventListener('mouseup', onMouseUp, { passive: true });
      window.addEventListener('touchend', onMouseUp, { passive: true });

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchend', onMouseUp);

        raf.cancel(moveRafId);
      };
    }
  }, [dragging]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    delayHidden();
    return () => {
			if (visibleTimeoutRef.current) {
				clearTimeout(visibleTimeoutRef.current);
			}
    };
  }, [scrollOffset]);

  // ====================== Imperative ======================
  useImperativeHandle(ref, () => ({
    delayHidden,
  }));

  // ======================== Render ========================
  const scrollbarPrefixCls = `${prefixCls}-scrollbar`;

  const containerStyle: CSSProperties = {
    position: 'absolute',
    visibility: visible ? undefined : 'hidden',
  };

  const thumbStyle: CSSProperties = {
    position: 'absolute',
    borderRadius: 99,
    background: 'var(--rc-virtual-list-scrollbar-bg, rgba(0, 0, 0, 0.5))',
    cursor: 'pointer',
    userSelect: 'none',
  };

  if (horizontal) {
    Object.assign(containerStyle, {
      height: 8,
      left: 0,
      right: 0,
      bottom: 0,
    });

    Object.assign(thumbStyle, {
      height: '100%',
      width: spinSize,
      [isLTR ? 'left' : 'right']: top,
    });
  } else {
    Object.assign(containerStyle, {
      width: 8,
      top: 0,
      bottom: 0,
      [isLTR ? 'right' : 'left']: 0,
    });

    Object.assign(thumbStyle, {
      width: '100%',
      height: spinSize,
      top,
    });
  }

	return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
    <div
      ref={scrollbarRef}
      className={clsx(scrollbarPrefixCls, {
        [`${scrollbarPrefixCls}-horizontal`]: horizontal,
        [`${scrollbarPrefixCls}-vertical`]: !horizontal,
        [`${scrollbarPrefixCls}-visible`]: visible,
      })}
      style={{ ...containerStyle, ...style }}
      onMouseDown={onContainerMouseDown}
      onMouseMove={delayHidden}
    >
      {/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
      <div
        ref={thumbRef}
        className={clsx(`${scrollbarPrefixCls}-thumb`, {
          [`${scrollbarPrefixCls}-thumb-moving`]: dragging,
        })}
        style={{ ...thumbStyle, ...propsThumbStyle }}
	      // @ts-expect-error
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
});

if (process.env.NODE_ENV !== 'production') {
  ScrollBar.displayName = 'ScrollBar';
}

export default ScrollBar;
