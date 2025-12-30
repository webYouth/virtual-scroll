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

export type GridRef = {
  nativeElement: HTMLDivElement;
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
};

export interface GridProps<T> extends Omit<HTMLAttributes<any>, 'children'> {
  prefixCls?: string;
  children: RenderFunc<T>;
  data: T[];
  height?: number;
  itemHeight?: number;
  itemWidth?: number;
  columnCount?: number; // Number of columns in the grid
  columnWidth?: number; // Width of each column
  /** If not match virtual scroll condition, Set Grid still use height of container. */
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

  /** Trigger when render grid item changed */
  onVisibleChange?: (visibleList: T[], fullList: T[]) => void;

  /** Inject to inner container props. Only use when you need pass aria related data */
  innerProps?: InnerProps;

  /** Render extra content into Filler */
  extraRender?: (info: ExtraRenderInfo) => ReactNode;
}

export function RawGrid<T>(props: GridProps<T>, ref: Ref<GridRef>) {
  const {
    prefixCls = 'rc-virtual-grid',
    className,
    height,
    itemHeight,
    itemWidth,
    columnCount,
    columnWidth,
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

  // Calculate column count and width based on itemWidth or columnWidth
  const [calculatedColumnCount, calculatedColumnWidth] = useMemo(() => {
    if (columnCount) {
      return [columnCount, columnWidth || itemWidth || 100];
    } else if (columnWidth) {
      return [Math.floor((scrollWidth || 0) / columnWidth), columnWidth];
    } else if (itemWidth) {
      return [Math.floor((scrollWidth || 0) / itemWidth), itemWidth];
    }
    return [4, 100]; // default
  }, [columnCount, columnWidth, itemWidth, scrollWidth]);

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
  const containerHeight = useMemo(
    () => {
      const totalItems = data?.length || 0;
      const rows = Math.ceil(totalItems / calculatedColumnCount);
      return rows * (itemHeight || 0);
    },
    [data?.length, itemHeight, calculatedColumnCount],
  );
  const inVirtual =
    useVirtual &&
    data &&
    (Math.max(containerHeight, height || 0) > (height || 0) || !!scrollWidth);
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

    // Calculate start and end based on visible range in grid
    let startIndex: number;
    let startOffset: number;
    let endIndex: number;

    const dataLen = mergedData.length;
    if (dataLen === 0) {
      return {
        scrollHeight: 0,
        start: 0,
        end: -1,
        offset: 0,
      };
    }

    const rowHeight = itemHeight || 0;
    const rows = Math.ceil(dataLen / calculatedColumnCount);
    
    // Calculate which row the offsetTop falls in
    const startRow = Math.floor(offsetTop / rowHeight);
    const endRow = Math.min(
      Math.ceil((offsetTop + height) / rowHeight) + 1, // Add buffer row for smooth scrolling
      rows
    );

    startIndex = startRow * calculatedColumnCount;
    const endItemOfEndRow = endRow * calculatedColumnCount - 1;
    endIndex = Math.min(endItemOfEndRow, dataLen - 1);
    startOffset = startRow * rowHeight;

    // Ensure we have valid indices
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(dataLen - 1, endIndex);

    const totalHeight = rows * rowHeight;

    return {
      scrollHeight: totalHeight,
      start: startIndex,
      end: endIndex,
      offset: startOffset,
    };
  }, [
    inVirtual, 
    useVirtual, 
    offsetTop, 
    mergedData, 
    heightUpdatedMark, 
    height, 
    itemHeight, 
    calculatedColumnCount
  ]);

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

      // Fix nest Grid trigger TouchMove event
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
  /** We need told outside that some grid not rendered */
  useLayoutEffect(() => {
    if (onVisibleChange) {
      const renderList = mergedData.slice(start, end + 1);

      onVisibleChange(renderList, mergedData);
    }
  }, [start, end, mergedData]);

  // ================================ Extra =================================
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
  // Create grid layout for children
  const gridChildren = useMemo(() => {
    const visibleItems = mergedData.slice(start, end + 1);
    return visibleItems.map((item, index) => {
      const eleIndex = start + index;
      const row = Math.floor(eleIndex / calculatedColumnCount);
      const col = eleIndex % calculatedColumnCount;
      
      const node = children(item, eleIndex, {
        style: {
          width: calculatedColumnWidth,
          position: 'absolute',
          top: row * (itemHeight || 0),
          left: col * calculatedColumnWidth,
          height: itemHeight,
        },
        offsetX: 0,
      }) as ReactElement;

      const key = getKey(item);
      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            top: row * (itemHeight || 0),
            left: col * calculatedColumnWidth,
            width: calculatedColumnWidth,
            height: itemHeight,
          }}
        >
          {node}
        </div>
      );
    });
  }, [mergedData, start, end, calculatedColumnCount, calculatedColumnWidth, itemHeight, children, getKey]);

  let componentStyle: CSSProperties | null = null;
  if (height) {
    componentStyle = {
      [fullHeight ? 'height' : 'maxHeight']: height,
      ...ScrollStyle,
      position: 'relative',
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

  // Calculate grid container dimensions
  const totalItems = mergedData.length;
  const totalRows = Math.ceil(totalItems / calculatedColumnCount);
  const gridHeight = totalRows * (itemHeight || 0);
  const gridWidth = calculatedColumnCount * calculatedColumnWidth;

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
            height={gridHeight}
            offsetX={offsetLeft}
            offsetY={fillerOffset}
            scrollWidth={gridWidth}
            onInnerResize={collectHeight}
            ref={fillerInnerRef}
            innerProps={innerProps}
            rtl={isRTL}
            extra={extraContent}
          >
            <div
              style={{
                position: 'relative',
                height: gridHeight,
                width: gridWidth,
              }}
            >
              {gridChildren}
            </div>
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

const Grid = forwardRef<GridRef, GridProps<any>>(RawGrid);

Grid.displayName = 'Grid';

export default Grid as <Item = any>(
  props: GridProps<Item> & { ref?: Ref<GridRef> },
) => ReactElement;