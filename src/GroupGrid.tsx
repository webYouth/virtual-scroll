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

export type GroupGridRef = {
  nativeElement: HTMLDivElement;
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
};

// Define the group structure
export interface GroupItem<T> {
  key: Key;
  title?: string;
  children: T[];
}

export interface GroupGridProps<T> extends Omit<HTMLAttributes<any>, 'children'> {
  prefixCls?: string;
  children: RenderFunc<T>;
  groups: GroupItem<T>[];
  height?: number;
  itemHeight?: number;
  itemWidth?: number;
  columnCount?: number; // Number of columns in the grid
  columnWidth?: number; // Width of each column
  groupHeaderHeight?: number; // Height of group header
  /** If not match virtual scroll condition, Set GroupGrid still use height of container. */
  fullHeight?: boolean;
  groupKey: Key | ((group: GroupItem<T>) => Key);
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
  
  /** Render group header */
  groupHeaderRender?: (group: GroupItem<T>, index: number) => ReactNode;
}

export function RawGroupGrid<T>(props: GroupGridProps<T>, ref: Ref<GroupGridRef>) {
  const {
    prefixCls = 'rc-virtual-group-grid',
    className,
    height,
    itemHeight = 100,
    itemWidth,
    columnCount,
    columnWidth,
    groupHeaderHeight = 40,
    fullHeight = true,
    style,
    groups,
    children,
    groupKey,
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
    groupHeaderRender,
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

  // =============================== Group/Item Key ===============================
  const getGroupKey = useCallback<GetKey<GroupItem<T>>>(
    (group: GroupItem<T>) => {
      if (typeof groupKey === 'function') {
        return groupKey(group);
      }
      return group?.[groupKey as keyof GroupItem<T>] as Key;
    },
    [groupKey],
  );

  const getItemKey = useCallback<GetKey<T>>(
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
    useHeights(getItemKey, undefined, undefined);

  // ================================= MISC =================================
  const useVirtual = !!(virtual !== false && height);
  const containerHeight = useMemo(
    () => {
      if (!groups || groups.length === 0) return 0;
      
      return groups.reduce((totalHeight, group) => {
        const itemsCount = group.children.length;
        const rows = Math.ceil(itemsCount / calculatedColumnCount);
        return totalHeight + groupHeaderHeight + (rows * itemHeight);
      }, 0);
    },
    [groups, groupHeaderHeight, itemHeight, calculatedColumnCount],
  );
  
  const inVirtual = useVirtual && groups && containerHeight > (height || 0);
  const isRTL = direction === 'rtl';

  const mergedClassName = clsx(
    prefixCls,
    { [`${prefixCls}-rtl`]: isRTL },
    className,
  );
  const mergedGroups = groups || [];
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
    getKey: getItemKey,
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
  const rangeRef = useRef({ start: 0, end: mergedGroups.length });

  // ========================== Visible Calculation =========================
  const {
    scrollHeight,
    start,
    end,
    offset: fillerOffset,
    visibleItems,
    visibleGroups,
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  } = useMemo(() => {
    if (!useVirtual) {
      return {
        scrollHeight: undefined,
        start: 0,
        end: mergedGroups.length - 1,
        offset: undefined,
        visibleItems: [],
        visibleGroups: [],
      };
    }

    // Always use virtual scroll bar in avoid shaking
    if (!inVirtual) {
      return {
        scrollHeight: fillerInnerRef.current?.offsetHeight || 0,
        start: 0,
        end: mergedGroups.length - 1,
        offset: undefined,
        visibleItems: [],
        visibleGroups: [],
      };
    }

    // Calculate start and end based on visible range in grouped grid
    let startIndex: number;
    let startOffset: number;
    let endIndex: number;
    const visibleItems: Array<{ item: T; groupIndex: number; itemIndex: number }> = [];
    const visibleGroups: Array<{ group: GroupItem<T>; startIndex: number; endIndex: number }> = [];

    if (mergedGroups.length === 0) {
      return {
        scrollHeight: 0,
        start: 0,
        end: -1,
        offset: 0,
        visibleItems: [],
        visibleGroups: [],
      };
    }

    // Calculate start and end based on offsetTop
    let currentOffset = 0;
    let calculatedStart = -1;
    let calculatedEnd = -1;
    let calculatedStartOffset = 0;
    
    for (let groupIndex = 0; groupIndex < mergedGroups.length; groupIndex++) {
      const group = mergedGroups[groupIndex];
      const itemsCount = group.children.length;
      const rows = Math.ceil(itemsCount / calculatedColumnCount);
      const groupHeight = groupHeaderHeight + (rows * itemHeight);
      
      // Check if the group is in the visible range
      const groupEndOffset = currentOffset + groupHeight;
      
      if (calculatedStart === -1 && groupEndOffset > offsetTop) {
        calculatedStart = groupIndex;
        calculatedStartOffset = currentOffset;
      }
      
      if (calculatedEnd === -1 && groupEndOffset >= offsetTop + (height || 0)) {
        calculatedEnd = groupIndex;
      }
      
      // Add items to visible list if the group is visible
      if (currentOffset <= offsetTop + (height || 0) && groupEndOffset >= offsetTop) {
        visibleGroups.push({
          group,
          startIndex: visibleItems.length,
          endIndex: visibleItems.length + itemsCount - 1
        });
        
        for (let itemIndex = 0; itemIndex < itemsCount; itemIndex++) {
          visibleItems.push({
            item: group.children[itemIndex],
            groupIndex,
            itemIndex
          });
        }
      }
      
      currentOffset = groupEndOffset;
    }
    
    // If we didn't find an end, set it to the last group
    if (calculatedEnd === -1) {
      calculatedEnd = mergedGroups.length - 1;
    }

    startIndex = Math.max(0, calculatedStart);
    endIndex = Math.min(mergedGroups.length - 1, calculatedEnd);

    return {
      scrollHeight: currentOffset,
      start: startIndex,
      end: endIndex,
      offset: calculatedStartOffset,
      visibleItems,
      visibleGroups,
    };
  }, [
    inVirtual,
    useVirtual,
    offsetTop,
    mergedGroups,
    heightUpdatedMark,
    height,
    itemHeight,
    calculatedColumnCount,
    groupHeaderHeight
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
      const startItem = visibleItems?.[0]?.item;
      if (startItem && prevCacheHeight === undefined) {
        const startIndexKey = getItemKey(startItem);
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

      // Fix nest GroupGrid trigger TouchMove event
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

  // For group grid, we'll use a simplified scroll to just scroll to a group
  const scrollTo = useScrollTo<T>(
    // @ts-expect-error
    componentRef,
    visibleItems?.map(vi => vi.item) || [],
    heights,
    itemHeight,
    getItemKey,
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
      const renderList = visibleItems?.map(vi => vi.item) || [];

      onVisibleChange(renderList, 
        mergedGroups.flatMap(g => g.children)
      );
    }
  }, [start, end, visibleItems, mergedGroups]);

  // ================================ Extra =================================
  const getSize = useGetSize(
    visibleItems?.map(vi => vi.item) || [],
    getItemKey,
    heights,
    itemHeight
  );

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
  // Create grouped grid layout for children
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
      const groupedGridChildren = useMemo(() => {
    if (!visibleItems || visibleItems.length === 0) return null;

    const elements: ReactElement[] = [];
    
    let currentOffsetY = 0;
    
    // Calculate the offset for the visible range
    for (let groupIndex = start; groupIndex <= end && groupIndex < mergedGroups.length; groupIndex++) {
      const group = mergedGroups[groupIndex];
      const itemsCount = group.children.length;
      const rows = Math.ceil(itemsCount / calculatedColumnCount);
      const groupHeight = groupHeaderHeight + (rows * itemHeight);
      
      // If this group is not in the visible range yet, skip to next
      if (currentOffsetY + groupHeight < offsetTop) {
        currentOffsetY += groupHeight;
        continue;
      }
      
      // Add group header
      const groupKey = getGroupKey(group);
      elements.push(
        <div
          key={`header-${groupKey}`}
          style={{
            position: 'absolute',
            top: currentOffsetY,
            left: 0,
            width: '100%',
            height: groupHeaderHeight,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 10,
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #e8e8e8',
          }}
        >
          {groupHeaderRender ? groupHeaderRender(group, groupIndex) : group.title || `Group ${groupIndex + 1}`}
        </div>
      );
      
      currentOffsetY += groupHeaderHeight;

      // Add grid items for this group
      const groupItems = group.children;
      for (let itemIndex = 0; itemIndex < groupItems.length; itemIndex++) {
        const item = groupItems[itemIndex];
        const itemEleIndex = groupIndex * 10000 + itemIndex; // Use a unique index
        const row = Math.floor(itemIndex / calculatedColumnCount);
        const col = itemIndex % calculatedColumnCount;
        
        const node = children(item, itemEleIndex, {
          style: {
            width: calculatedColumnWidth,
            height: itemHeight,
          },
          offsetX: 0,
        }) as ReactElement;

        const itemKey = getItemKey(item);
        
        elements.push(
          <div
            key={`item-${groupKey}-${itemKey}`}
            style={{
              position: 'absolute',
              top: currentOffsetY + row * itemHeight,
              left: col * calculatedColumnWidth,
              width: calculatedColumnWidth,
              height: itemHeight,
            }}
          >
            {node}
          </div>
        );
      }
      
      currentOffsetY += rows * itemHeight;
    }

    return elements;
  }, [
    mergedGroups, 
    start, 
    end, 
    calculatedColumnCount, 
    calculatedColumnWidth, 
    itemHeight,
    groupHeaderHeight,
    children, 
    getItemKey, 
    getGroupKey,
    groupHeaderRender,
    offsetTop
  ]);

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

  // Calculate total grid dimensions
  const totalHeight = useMemo(() => {
    if (!mergedGroups || mergedGroups.length === 0) return 0;
    
    return mergedGroups.reduce((totalHeight, group) => {
      const itemsCount = group.children.length;
      const rows = Math.ceil(itemsCount / calculatedColumnCount);
      return totalHeight + groupHeaderHeight + (rows * itemHeight);
    }, 0);
  }, [mergedGroups, groupHeaderHeight, itemHeight, calculatedColumnCount]);

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
            height={totalHeight}
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
                height: totalHeight,
                width: gridWidth,
              }}
            >
              {groupedGridChildren}
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

const GroupGrid = forwardRef<GroupGridRef, GroupGridProps<any>>(RawGroupGrid);

GroupGrid.displayName = 'GroupGrid';

export default GroupGrid as <Item = any>(
  props: GroupGridProps<Item> & { ref?: Ref<GroupGridRef> },
) => ReactElement;