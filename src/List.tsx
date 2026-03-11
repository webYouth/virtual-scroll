import type { ResizeObserverProps } from '@rc-component/resize-observer';
import ResizeObserver from '@rc-component/resize-observer';
import { useEvent } from '@rc-component/util';
import useLayoutEffect from '@rc-component/util/lib/hooks/useLayoutEffect';
import { clsx } from 'clsx';
import {
  type ComponentClass,
  type CSSProperties,
  type FC,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type ReactElement,
  type ReactNode,
  type Ref,
  type UIEventHandler,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { getSpinSize } from '@/utils/scrollbarUtil';
import type { InnerProps } from './Filler';
import Filler from './Filler';
import useChildren from './hooks/useChildren';
import useDiffItem from './hooks/useDiffItem';
import useFrameWheel from './hooks/useFrameWheel';
import { useGetSize } from './hooks/useGetSize';
import useHeights from './hooks/useHeights';
import useMobileTouchMove from './hooks/useMobileTouchMove';
import useOriginScroll from './hooks/useOriginScroll';
import useScrollDrag from './hooks/useScrollDrag';
import type { ScrollPos, ScrollTarget } from './hooks/useScrollTo';
import useScrollTo from './hooks/useScrollTo';
import type {
  ExtraRenderInfo,
  GetKey,
  RenderFunc,
  SharedConfig,
} from './interface';
import type { ScrollBarDirectionType, ScrollBarRef } from './ScrollBar';
import ScrollBar from './ScrollBar';

const EMPTY_DATA: never[] = [];

const ScrollStyle: CSSProperties = {
  overflowY: 'auto',
  overflowAnchor: 'none',
};

export interface ScrollInfo {
  x: number;
  y: number;
}

export type ScrollConfig = ScrollTarget | ScrollPos;

export type ScrollTo = (arg?: number | ScrollConfig | null) => void;

export type ListRef = {
  nativeElement: HTMLDivElement;
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
};

export interface ListProps<T> extends Omit<HTMLAttributes<any>, 'children'> {
  prefixCls?: string;
  children: RenderFunc<T>;
  data: T[];
  height?: number;
  itemHeight?: number;
  /** If not match virtual scroll condition, Set List still use height of container. */
  fullHeight?: boolean;
  itemKey: Key | ((item: T) => Key);
  component?: string | FC<any> | ComponentClass<any>;
  /** Set `false` will always use real scroll instead of virtual one */
  virtual?: boolean;
  direction?: ScrollBarDirectionType;
  /**
   * By default `scrollWidth` is same as container.
   * When set this, it will show the horizontal scrollbar and
   * `scrollWidth` will be used as the real width instead of container width.
   * When set, `virtual` will always be enabled.
   */
  scrollWidth?: number;

  styles?: {
    horizontalScrollBar?: CSSProperties;
    horizontalScrollBarThumb?: CSSProperties;
    verticalScrollBar?: CSSProperties;
    verticalScrollBarThumb?: CSSProperties;
  };
  showScrollBar?: boolean | 'optional';
  onScroll?: UIEventHandler<HTMLElement>;

  /**
   * Given the virtual offset value.
   * It's the logic offset from start position.
   */
  onVirtualScroll?: (info: ScrollInfo) => void;

  /** Trigger when render list item changed */
  onVisibleChange?: (visibleList: T[], fullList: T[]) => void;

  /** Inject to inner container props. Only use when you need pass aria related data */
  innerProps?: InnerProps;

  /** Render extra content into Filler */
  extraRender?: (info: ExtraRenderInfo) => ReactNode;
}

export function RawList<T>(props: ListProps<T>, ref: Ref<ListRef>) {
  const {
    prefixCls = 'rc-virtual-list',
    className,
    height,
    itemHeight,
    fullHeight = true,
    style,
    data,
    children,
    itemKey,
    virtual,
    direction,
    scrollWidth,
    component: Component = 'div',
    onScroll,
    onVirtualScroll,
    onVisibleChange,
    innerProps,
    extraRender,
    styles,
    showScrollBar = 'optional',
    ...restProps
  } = props;

  // =============================== Item Key ===============================
  const getKey = useCallback<GetKey<T>>(
    (item: T) => {
      if (typeof itemKey === 'function') {
        return itemKey(item);
      }
      // @ts-expect-error
      return item?.[itemKey as string];
    },
    [itemKey],
  );

  // ================================ Height ================================
  const [setInstanceRef, collectHeight, heights, heightUpdatedMark] =
    useHeights(getKey, undefined, undefined);

  // ================================= MISC =================================
  const useVirtual = !!(virtual !== false && height && itemHeight);
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const containerHeight = useMemo(
    () => Object.values(heights.maps).reduce((total, curr) => total + curr, 0),
    [heights.id, heights.maps],
  );
  const inVirtual =
    useVirtual &&
    data &&
    (Math.max(itemHeight * data.length, containerHeight) > height ||
      !!scrollWidth);
  const isRTL = direction === 'rtl';

  const mergedClassName = clsx(
    prefixCls,
    { [`${prefixCls}-rtl`]: isRTL },
    className,
  );
  const mergedData = data || EMPTY_DATA;
  const componentRef = useRef<HTMLDivElement>(null);
  const fillerInnerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // =============================== Item Key ===============================

  const [offsetTop, setOffsetTop] = useState(0);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [scrollMoving, setScrollMoving] = useState(false);

  const onScrollbarStartMove = () => {
    setScrollMoving(true);
  };
  const onScrollbarStopMove = () => {
    setScrollMoving(false);
  };

  const sharedConfig: SharedConfig<T> = {
    getKey,
  };

  // ================================ Scroll ================================
  function syncScrollTop(newTop: number | ((prev: number) => number)) {
    setOffsetTop((origin) => {
      let value: number;
      if (typeof newTop === 'function') {
        value = newTop(origin);
      } else {
        value = newTop;
      }

      const alignedTop = keepInRange(value);

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      componentRef.current!.scrollTop = alignedTop;
      return alignedTop;
    });
  }

  // ================================ Legacy ================================
  // Put ref here since the range is generate by follow
  const rangeRef = useRef({ start: 0, end: mergedData.length });

  const diffItemRef = useRef<T>(null);
  const [diffItem] = useDiffItem(mergedData, getKey);
  diffItemRef.current = diffItem;

  // ========================== Visible Calculation =========================
  const {
    scrollHeight,
    start,
    end,
    offset: fillerOffset,
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  } = useMemo(() => {
    if (!useVirtual) {
      return {
        scrollHeight: undefined,
        start: 0,
        end: mergedData.length - 1,
        offset: undefined,
      };
    }

    // Always use virtual scroll bar in avoid shaking
    if (!inVirtual) {
      return {
        scrollHeight: fillerInnerRef.current?.offsetHeight || 0,
        start: 0,
        end: mergedData.length - 1,
        offset: undefined,
      };
    }

    let itemTop = 0;
    let startIndex: number;
    let startOffset: number;
    let endIndex: number;

    const dataLen = mergedData.length;
    for (let i = 0; i < dataLen; i += 1) {
      const item = mergedData[i];
      const key = getKey(item);

      const cacheHeight = heights.get(key);
      const currentItemBottom =
        itemTop + (cacheHeight === undefined ? itemHeight : cacheHeight);

      // Check item top in the range
      // @ts-expect-error
      if (currentItemBottom >= offsetTop && startIndex === undefined) {
        startIndex = i;
        startOffset = itemTop;
      }

      // Check item bottom in the range. We will render additional one item for motion usage
      // @ts-expect-error
      if (currentItemBottom > offsetTop + height && endIndex === undefined) {
        endIndex = i;
      }

      itemTop = currentItemBottom;
    }

    // When scrollTop at the end but data cut to small count will reach this
    // @ts-expect-error
    if (startIndex === undefined) {
      startIndex = 0;
      startOffset = 0;

      endIndex = Math.ceil(height / itemHeight);
    }
    // @ts-expect-error
    if (endIndex === undefined) {
      endIndex = mergedData.length - 1;
    }

    // Give cache to improve scroll experience
    endIndex = Math.min(endIndex + 1, mergedData.length - 1);

    return {
      scrollHeight: itemTop,
      start: startIndex,
      end: endIndex,
      // @ts-expect-error
      offset: startOffset,
    };
  }, [inVirtual, useVirtual, offsetTop, mergedData, heightUpdatedMark, height]);

  rangeRef.current.start = start;
  rangeRef.current.end = end;

  // When scroll up, first visible item get real height may not same as `itemHeight`,
  // Which will make scroll jump.
  // Let's sync scroll top to avoid jump
  useLayoutEffect(() => {
    const changedRecord = heights.getRecord();
    if (changedRecord.size === 1) {
      const recordKey = Array.from(changedRecord.keys())[0];
      const prevCacheHeight = changedRecord.get(recordKey);

      // Quick switch data may cause `start` not in `mergedData` anymore
      const startItem = mergedData[start];
      if (startItem && prevCacheHeight === undefined) {
        const startIndexKey = getKey(startItem);
        if (startIndexKey === recordKey) {
          const realStartHeight = heights.get(recordKey);
          const diffHeight = realStartHeight - (itemHeight ?? 0);
          syncScrollTop((ori) => {
            return ori + diffHeight;
          });
        }
      }
    }

    heights.resetRecord();
  }, [scrollHeight]);

  // ================================= Size =================================
  const [size, setSize] = useState({ width: 0, height });

  const onHolderResize: ResizeObserverProps['onResize'] = (sizeInfo) => {
    setSize({
      width: sizeInfo.offsetWidth,
      height: sizeInfo.offsetHeight,
    });
  };

  // Hack on scrollbar to enable flash call
  const verticalScrollBarRef = useRef<ScrollBarRef>(null);
  const horizontalScrollBarRef = useRef<ScrollBarRef>(null);

  const horizontalScrollBarSpinSize = useMemo(
    () => getSpinSize(size.width, scrollWidth),
    [size.width, scrollWidth],
  );
  const verticalScrollBarSpinSize = useMemo(
    () => getSpinSize(size.height, scrollHeight),
    [size.height, scrollHeight],
  );

  // =============================== In Range ===============================
  const maxScrollHeight = (scrollHeight ?? 0) - (height ?? 0);
  const maxScrollHeightRef = useRef(maxScrollHeight);
  maxScrollHeightRef.current = maxScrollHeight;

  function keepInRange(newScrollTop: number) {
    let newTop = newScrollTop;
    if (!Number.isNaN(maxScrollHeightRef.current)) {
      newTop = Math.min(newTop, maxScrollHeightRef.current);
    }
    newTop = Math.max(newTop, 0);
    return newTop;
  }

  const isScrollAtTop = offsetTop <= 0;
  const isScrollAtBottom = offsetTop >= maxScrollHeight;
  const isScrollAtLeft = offsetLeft <= 0;
  const isScrollAtRight = offsetLeft >= (scrollWidth ?? 0);

  const originScroll = useOriginScroll(
    isScrollAtTop,
    isScrollAtBottom,
    isScrollAtLeft,
    isScrollAtRight,
  );

  // ================================ Scroll ================================
  const getVirtualScrollInfo = () => ({
    x: isRTL ? -offsetLeft : offsetLeft,
    y: offsetTop,
  });

  const lastVirtualScrollInfoRef = useRef(getVirtualScrollInfo());

  const triggerScroll = useEvent((params?: { x?: number; y?: number }) => {
    if (onVirtualScroll) {
      const nextInfo = { ...getVirtualScrollInfo(), ...params };

      // Trigger when offset changed
      if (
        lastVirtualScrollInfoRef.current.x !== nextInfo.x ||
        lastVirtualScrollInfoRef.current.y !== nextInfo.y
      ) {
        onVirtualScroll(nextInfo);

        lastVirtualScrollInfoRef.current = nextInfo;
      }
    }
  });

  function onScrollBar(newScrollOffset: number, horizontal?: boolean) {
    const newOffset = newScrollOffset;

    if (horizontal) {
      flushSync(() => {
        setOffsetLeft(newOffset);
      });
      triggerScroll();
    } else {
      syncScrollTop(newOffset);
    }
  }

  // When data size reduce. It may trigger native scroll event back to fit scroll position
  // @ts-expect-error
  function onFallbackScroll(e: UIEvent<HTMLDivElement>) {
    const { scrollTop: newScrollTop } = e.currentTarget;
    if (newScrollTop !== offsetTop) {
      syncScrollTop(newScrollTop);
    }

    // Trigger origin onScroll
    onScroll?.(e);
    triggerScroll();
  }

  const keepInHorizontalRange = (nextOffsetLeft: number) => {
    let tmpOffsetLeft = nextOffsetLeft;
    const max = scrollWidth ? scrollWidth - size.width : 0;
    tmpOffsetLeft = Math.max(tmpOffsetLeft, 0);
    tmpOffsetLeft = Math.min(tmpOffsetLeft, max);

    return tmpOffsetLeft;
  };

  const onWheelDelta: Parameters<typeof useFrameWheel>[6] = useEvent(
    (offsetXY, fromHorizontal) => {
      if (fromHorizontal) {
        flushSync(() => {
          setOffsetLeft((left) => {
            const nextOffsetLeft = left + (isRTL ? -offsetXY : offsetXY);

            return keepInHorizontalRange(nextOffsetLeft);
          });
        });

        triggerScroll();
      } else {
        syncScrollTop((top) => {
          const newTop = top + offsetXY;

          return newTop;
        });
      }
    },
  );

  // Since this added in global,should use ref to keep update
  const [onRawWheel, onFireFoxScroll] = useFrameWheel(
    useVirtual,
    isScrollAtTop,
    isScrollAtBottom,
    isScrollAtLeft,
    isScrollAtRight,
    !!scrollWidth,
    onWheelDelta,
  );

  // Mobile touch move
  useMobileTouchMove(
    useVirtual,
    // @ts-expect-error
    componentRef,
    (isHorizontal, delta, smoothOffset, e) => {
      const event = e as TouchEvent & {
        _virtualHandled?: boolean;
      };

      if (originScroll(isHorizontal, delta, smoothOffset)) {
        return false;
      }

      // Fix nest List trigger TouchMove event
      if (!event || !event._virtualHandled) {
        if (event) {
          event._virtualHandled = true;
        }

        onRawWheel({
          preventDefault() {},
          deltaX: isHorizontal ? delta : 0,
          deltaY: isHorizontal ? 0 : delta,
        } as WheelEvent);

        return true;
      }

      return false;
    },
  );

  // MouseDown drag for scroll
  // @ts-expect-error
  useScrollDrag(inVirtual, componentRef, (offset) => {
    syncScrollTop((top) => top + offset);
  });

  useLayoutEffect(() => {
    // Firefox only
    function onMozMousePixelScroll(e: WheelEvent) {
      // scrolling at top/bottom limit
      const scrollingUpAtTop = isScrollAtTop && e.detail < 0;
      const scrollingDownAtBottom = isScrollAtBottom && e.detail > 0;
      if (useVirtual && !scrollingUpAtTop && !scrollingDownAtBottom) {
        e.preventDefault();
      }
    }

    const componentEle = componentRef.current;
    componentEle?.addEventListener('wheel', onRawWheel, { passive: false });
    componentEle?.addEventListener('DOMMouseScroll', onFireFoxScroll as any, {
      passive: true,
    });
    // @ts-expect-error
    componentEle?.addEventListener(
      'MozMousePixelScroll',
      onMozMousePixelScroll,
      { passive: false },
    );

    return () => {
      componentEle?.removeEventListener('wheel', onRawWheel);
      componentEle?.removeEventListener(
        'DOMMouseScroll',
        onFireFoxScroll as any,
      );
      componentEle?.removeEventListener(
        'MozMousePixelScroll',
        onMozMousePixelScroll as any,
      );
    };
  }, [useVirtual, isScrollAtTop, isScrollAtBottom]);

  // Sync scroll left
  useLayoutEffect(() => {
    if (scrollWidth) {
      const newOffsetLeft = keepInHorizontalRange(offsetLeft);
      setOffsetLeft(newOffsetLeft);
      triggerScroll({ x: newOffsetLeft });
    }
  }, [size.width, scrollWidth]);

  // ================================= Ref ==================================
  const delayHideScrollBar = () => {
    verticalScrollBarRef.current?.delayHidden();
    horizontalScrollBarRef.current?.delayHidden();
  };

  const scrollTo = useScrollTo<T>(
    // @ts-expect-error
    componentRef,
    mergedData,
    heights,
    itemHeight,
    getKey,
    () => collectHeight(true),
    syncScrollTop,
    delayHideScrollBar,
  );

  useImperativeHandle(ref, () => ({
    // @ts-expect-error
    nativeElement: containerRef.current,
    getScrollInfo: getVirtualScrollInfo,
    scrollTo: (config) => {
      function isPosScroll(arg: any): arg is ScrollPos {
        return (
          arg && typeof arg === 'object' && ('left' in arg || 'top' in arg)
        );
      }

      if (isPosScroll(config)) {
        // Scroll X
        if (config.left !== undefined) {
          setOffsetLeft(keepInHorizontalRange(config.left));
        }

        // Scroll Y
        scrollTo(config.top ?? 0);
      } else {
        scrollTo(config ?? 0);
      }
    },
  }));

  // ================================ Effect ================================
  /** We need told outside that some list not rendered */
  useLayoutEffect(() => {
    if (onVisibleChange) {
      const renderList = mergedData.slice(start, end + 1);

      onVisibleChange(renderList, mergedData);
    }
  }, [start, end, mergedData]);

  // ================================ Extra =================================
  // @ts-expect-error
  const getSize = useGetSize(mergedData, getKey, heights, itemHeight);

  const extraContent = extraRender?.({
    start,
    end,
    virtual: inVirtual,
    offsetX: offsetLeft,
    offsetY: fillerOffset ?? 0,
    rtl: isRTL,
    getSize,
  });

  // ================================ Render ================================
  const listChildren = useChildren(
    mergedData,
    start,
    end,
    scrollWidth ?? 0,
    offsetLeft,
    // @ts-expect-error
    setInstanceRef,
    children,
    sharedConfig,
  );

  let componentStyle: CSSProperties | null = null;
  if (height) {
    componentStyle = {
      [fullHeight ? 'height' : 'maxHeight']: height,
      ...ScrollStyle,
    };

    if (useVirtual) {
      componentStyle.overflowY = 'hidden';

      if (scrollWidth) {
        componentStyle.overflowX = 'hidden';
      }

      if (scrollMoving) {
        componentStyle.pointerEvents = 'none';
      }
    }
  }

  const containerProps: HTMLAttributes<HTMLDivElement> = {};
  if (isRTL) {
    containerProps.dir = 'rtl';
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        position: 'relative',
      }}
      className={mergedClassName}
      {...containerProps}
      {...restProps}
    >
      <ResizeObserver onResize={onHolderResize}>
        <Component
          className={`${prefixCls}-holder`}
          style={componentStyle}
          ref={componentRef}
          onScroll={onFallbackScroll}
          onMouseEnter={delayHideScrollBar}
        >
          <Filler
            prefixCls={prefixCls}
            // @ts-expect-error
            height={scrollHeight}
            offsetX={offsetLeft}
            offsetY={fillerOffset}
            scrollWidth={scrollWidth}
            onInnerResize={collectHeight}
            ref={fillerInnerRef}
            innerProps={innerProps}
            rtl={isRTL}
            extra={extraContent}
          >
            {listChildren}
          </Filler>
        </Component>
      </ResizeObserver>

      {inVirtual && ((scrollHeight ?? 0) > height) && (
        <ScrollBar
          ref={verticalScrollBarRef}
          prefixCls={prefixCls}
          scrollOffset={offsetTop}
          scrollRange={scrollHeight ?? 0}
          rtl={isRTL}
          onScroll={onScrollBar}
          onStartMove={onScrollbarStartMove}
          onStopMove={onScrollbarStopMove}
          spinSize={verticalScrollBarSpinSize}
          containerSize={size.height ?? 0}
          style={styles?.verticalScrollBar}
          thumbStyle={styles?.verticalScrollBarThumb}
          showScrollBar={showScrollBar}
        />
      )}

      {inVirtual && (scrollWidth ?? 0 > size.width) && (
        <ScrollBar
          ref={horizontalScrollBarRef}
          prefixCls={prefixCls}
          scrollOffset={offsetLeft}
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          scrollRange={scrollWidth!}
          rtl={isRTL}
          onScroll={onScrollBar}
          onStartMove={onScrollbarStartMove}
          onStopMove={onScrollbarStopMove}
          spinSize={horizontalScrollBarSpinSize}
          containerSize={size.width}
          horizontal
          style={styles?.horizontalScrollBar}
          thumbStyle={styles?.horizontalScrollBarThumb}
          showScrollBar={showScrollBar}
        />
      )}
    </div>
  );
}

const List = forwardRef<ListRef, ListProps<any>>(RawList);

List.displayName = 'List';

export default List as <Item = any>(
  props: ListProps<Item> & { ref?: Ref<ListRef> },
) => ReactElement;
