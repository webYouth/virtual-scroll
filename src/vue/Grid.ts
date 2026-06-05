import { clsx } from 'clsx';
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
  type CSSProperties,
  type PropType,
  type VNode,
} from 'vue';
import { getSpinSize } from '../utils/scrollbarUtil';
import { Filler, type InnerProps } from './Filler';
import { useFrameWheel } from './composables/useFrameWheel';
import { useHeights } from './composables/useHeights';
import { useMobileTouchMove } from './composables/useMobileTouchMove';
import { useOriginScroll } from './composables/useOriginScroll';
import { useScrollDrag } from './composables/useScrollDrag';
import { type ScrollAlign, type ScrollPos, type ScrollTarget, useScrollTo } from './composables/useScrollTo';
import { ScrollBar, type ScrollBarExposed } from './ScrollBar';
import type { ExtraRenderInfo, GetKey, Key, ScrollInfo } from './interface';

export type ScrollConfig = ScrollTarget | ScrollPos;
export type ScrollTo = (arg?: number | ScrollConfig | null) => void;

export interface GridRef {
  nativeElement: HTMLDivElement;
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
}

export const Grid = defineComponent({
  name: 'VirtualGrid',

  props: {
    prefixCls: { type: String, default: 'rc-virtual-grid' },
    data: { type: Array as PropType<any[]>, default: () => [] },
    height: Number,
    itemHeight: Number,
    itemWidth: Number,
    columnCount: Number,
    columnWidth: Number,
    gap: { type: Number, default: 0 },
    fullHeight: { type: Boolean, default: true },
    itemKey: { type: [String, Function] as PropType<Key | ((item: any) => Key)>, required: true },
    virtual: { type: Boolean, default: true },
    direction: { type: String as PropType<'ltr' | 'rtl'>, default: 'ltr' },
    scrollWidth: Number,
    showScrollBar: { type: [Boolean, String] as PropType<boolean | 'optional'>, default: 'optional' },
    onScroll: Function as PropType<(e: Event) => void>,
    onVirtualScroll: Function as PropType<(info: ScrollInfo) => void>,
    onVisibleChange: Function as PropType<(visible: any[], full: any[]) => void>,
    innerProps: Object as PropType<InnerProps>,
    extraRender: Function as PropType<(info: ExtraRenderInfo) => VNode | null>,
    styles: Object as PropType<{
      horizontalScrollBar?: CSSProperties;
      horizontalScrollBarThumb?: CSSProperties;
      verticalScrollBar?: CSSProperties;
      verticalScrollBarThumb?: CSSProperties;
    }>,
    class: [String, Array, Object] as PropType<string | string[] | Record<string, boolean>>,
    style: [String, Object] as PropType<string | CSSProperties>,
  },

  setup(props, { slots, expose }) {
    // ========================== Column Calculation ==========================
    const gridLayout = computed(() => {
      if (props.columnCount) {
        return { count: props.columnCount, width: props.columnWidth || props.itemWidth || 100 };
      }
      if (props.columnWidth) {
        return { count: Math.floor((props.scrollWidth || 0) / props.columnWidth), width: props.columnWidth };
      }
      if (props.itemWidth) {
        return { count: Math.floor((props.scrollWidth || 0) / props.itemWidth), width: props.itemWidth };
      }
      return { count: 4, width: 100 };
    });

    const calculatedColumnCount = computed(() => gridLayout.value.count);
    const calculatedColumnWidth = computed(() => gridLayout.value.width);

    // =============================== Item Key ===============================
    function getKey(item: any): Key {
      if (typeof props.itemKey === 'function') return props.itemKey(item);
      return item?.[props.itemKey as string];
    }

    // ================================ Height ================================
    const { setInstanceRef, collectHeight, heights, updatedMark } = useHeights(getKey);

    // ================================= Refs =================================
    const containerRef = ref<HTMLDivElement | null>(null);
    const componentRef = ref<HTMLDivElement | null>(null);
    const fillerInnerRef = ref<HTMLDivElement | null>(null);
    const verticalScrollBarRef = ref<ScrollBarExposed | null>(null);
    const horizontalScrollBarRef = ref<ScrollBarExposed | null>(null);

    // ================================= State ================================
    const offsetTop = ref(0);
    const offsetLeft = ref(0);
    const scrollMoving = ref(false);
    const holderSize = ref({ width: 0, height: props.height ?? 0 });

    // ================================= MISC =================================
    const mergedData = computed(() => props.data || []);
    const isRTL = computed(() => props.direction === 'rtl');

    const useVirtual = computed(
      () => !!(props.virtual !== false && props.height && props.itemHeight),
    );

    const totalRows = computed(() =>
      Math.ceil(mergedData.value.length / calculatedColumnCount.value),
    );

    // Total scrollable height accounting for gap between rows
    const containerHeight = computed(() => {
      const rows = totalRows.value;
      if (rows === 0) return 0;
      const gap = props.gap ?? 0;
      return rows * (props.itemHeight || 0) + Math.max(0, rows - 1) * gap;
    });

    const inVirtual = computed(
      () =>
        useVirtual.value &&
        mergedData.value.length > 0 &&
        (Math.max(containerHeight.value, props.height ?? 0) > (props.height ?? 0) || !!props.scrollWidth),
    );

    // ========================== Visible Calculation =========================
    const visibleRange = computed(() => {
      if (!useVirtual.value) {
        return { scrollHeight: undefined as number | undefined, start: 0, end: mergedData.value.length - 1, offset: undefined as number | undefined };
      }

      if (!inVirtual.value) {
        return { scrollHeight: fillerInnerRef.value?.offsetHeight || 0, start: 0, end: mergedData.value.length - 1, offset: undefined as number | undefined };
      }

      const dataLen = mergedData.value.length;
      if (dataLen === 0) {
        return { scrollHeight: 0, start: 0, end: -1, offset: 0 };
      }

      const rowHeight = props.itemHeight || 0;
      const gap = props.gap ?? 0;
      // pitch = distance from top of one row to top of the next (includes gap)
      const pitch = rowHeight + gap;
      const rows = Math.ceil(dataLen / calculatedColumnCount.value);
      const startRow = Math.floor(offsetTop.value / pitch);
      const endRow = Math.min(
        Math.ceil((offsetTop.value + props.height!) / pitch) + 1,
        rows,
      );

      const startIndex = Math.max(0, startRow * calculatedColumnCount.value);
      const endIndex = Math.min(endRow * calculatedColumnCount.value - 1, dataLen - 1);
      // fillerOffset is the visual top of the first visible row
      const startOffset = startRow * pitch;
      const totalHeight = rows > 0 ? rows * rowHeight + Math.max(0, rows - 1) * gap : 0;

      return { scrollHeight: totalHeight, start: startIndex, end: endIndex, offset: startOffset };
    });

    const scrollHeight = computed(() => visibleRange.value.scrollHeight);
    const start = computed(() => visibleRange.value.start);
    const end = computed(() => visibleRange.value.end);
    const fillerOffset = computed(() => visibleRange.value.offset);

    // ========================= Scroll Jump Compensation =====================
    watch(scrollHeight, () => {
      const changedRecord = heights.getRecord();
      if (changedRecord.size === 1) {
        const recordKey = Array.from(changedRecord.keys())[0];
        const prevCacheHeight = changedRecord.get(recordKey);
        const startItem = mergedData.value[start.value];
        if (startItem && prevCacheHeight === undefined) {
          const startIndexKey = getKey(startItem);
          if (startIndexKey === recordKey) {
            const realStartHeight = heights.get(recordKey);
            const diffHeight = realStartHeight - (props.itemHeight ?? 0);
            syncScrollTop(offsetTop.value + diffHeight);
          }
        }
      }
      heights.resetRecord();
    }, { flush: 'post' });

    // ================================= Size =================================
    let holderResizeObserver: ResizeObserver | null = null;

    function setupHolderResizeObserver(el: HTMLElement) {
      holderResizeObserver?.disconnect();
      holderResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          holderSize.value = { width: target.offsetWidth, height: target.offsetHeight };
        }
      });
      holderResizeObserver.observe(el);
    }

    onUnmounted(() => holderResizeObserver?.disconnect());

    const horizontalScrollBarSpinSize = computed(() =>
      getSpinSize(holderSize.value.width, props.scrollWidth),
    );
    const verticalScrollBarSpinSize = computed(() =>
      getSpinSize(holderSize.value.height, scrollHeight.value),
    );

    // ============================== In Range ================================
    const maxScrollHeight = computed(() => (scrollHeight.value ?? 0) - (props.height ?? 0));

    function keepInRange(newScrollTop: number) {
      let newTop = newScrollTop;
      if (!Number.isNaN(maxScrollHeight.value)) newTop = Math.min(newTop, maxScrollHeight.value);
      return Math.max(newTop, 0);
    }

    const isScrollAtTop = computed(() => offsetTop.value <= 0);
    const isScrollAtBottom = computed(() => offsetTop.value >= maxScrollHeight.value);
    const isScrollAtLeft = computed(() => offsetLeft.value <= 0);
    const isScrollAtRight = computed(() => offsetLeft.value >= (props.scrollWidth ?? 0));

    const originScroll = useOriginScroll(
      () => isScrollAtTop.value,
      () => isScrollAtBottom.value,
      () => isScrollAtLeft.value,
      () => isScrollAtRight.value,
    );

    // ================================ Scroll ================================
    function syncScrollTop(newTop: number | ((prev: number) => number)) {
      const value = typeof newTop === 'function' ? newTop(offsetTop.value) : newTop;
      const aligned = keepInRange(value);
      if (componentRef.value) componentRef.value.scrollTop = aligned;
      offsetTop.value = aligned;
    }

    function getVirtualScrollInfo(): ScrollInfo {
      return { x: isRTL.value ? -offsetLeft.value : offsetLeft.value, y: offsetTop.value };
    }

    let lastVirtualScrollInfo = getVirtualScrollInfo();

    function triggerScroll(params?: { x?: number; y?: number }) {
      if (props.onVirtualScroll) {
        const nextInfo = { ...getVirtualScrollInfo(), ...params };
        if (lastVirtualScrollInfo.x !== nextInfo.x || lastVirtualScrollInfo.y !== nextInfo.y) {
          props.onVirtualScroll(nextInfo);
          lastVirtualScrollInfo = nextInfo;
        }
      }
    }

    function keepInHorizontalRange(nextOffsetLeft: number) {
      const max = props.scrollWidth ? props.scrollWidth - holderSize.value.width : 0;
      return Math.min(Math.max(nextOffsetLeft, 0), max);
    }

    function onScrollBar(newScrollOffset: number, horizontal?: boolean) {
      if (horizontal) {
        offsetLeft.value = newScrollOffset;
        triggerScroll();
      } else {
        syncScrollTop(newScrollOffset);
      }
    }

    function onFallbackScroll(e: Event) {
      const el = e.currentTarget as HTMLDivElement;
      if (el.scrollTop !== offsetTop.value) syncScrollTop(el.scrollTop);
      props.onScroll?.(e);
      triggerScroll();
    }

    function onWheelDelta(offsetXY: number, fromHorizontal: boolean) {
      if (fromHorizontal) {
        offsetLeft.value = keepInHorizontalRange(offsetLeft.value + (isRTL.value ? -offsetXY : offsetXY));
        triggerScroll();
      } else {
        syncScrollTop(offsetTop.value + offsetXY);
      }
    }

    const [onRawWheel, onFireFoxScroll] = useFrameWheel(
      () => useVirtual.value,
      () => isScrollAtTop.value,
      () => isScrollAtBottom.value,
      () => isScrollAtLeft.value,
      () => isScrollAtRight.value,
      !!props.scrollWidth,
      onWheelDelta,
    );

    useMobileTouchMove(() => useVirtual.value, componentRef, (isHorizontal, delta, smoothOffset, e) => {
      const event = e as (TouchEvent & { _virtualHandled?: boolean }) | undefined;
      if (originScroll(isHorizontal, delta, smoothOffset ?? false)) return false;
      if (!event || !event._virtualHandled) {
        if (event) event._virtualHandled = true;
        onRawWheel({ preventDefault() {}, deltaX: isHorizontal ? delta : 0, deltaY: isHorizontal ? 0 : delta } as WheelEvent);
        return true;
      }
      return false;
    });

    const scrollDrag = useScrollDrag(
      () => inVirtual.value,
      () => componentRef.value,
      (offset) => syncScrollTop(offsetTop.value + offset),
    );

    let wheelCleanup: (() => void) | undefined;

    onMounted(() => {
      const el = componentRef.value;
      if (!el) return;

      function onMozMousePixelScroll(e: WheelEvent) {
        const scrollingUpAtTop = isScrollAtTop.value && (e as any).detail < 0;
        const scrollingDownAtBottom = isScrollAtBottom.value && (e as any).detail > 0;
        if (useVirtual.value && !scrollingUpAtTop && !scrollingDownAtBottom) e.preventDefault();
      }

      el.addEventListener('wheel', onRawWheel as EventListener, { passive: false });
      el.addEventListener('DOMMouseScroll', onFireFoxScroll as unknown as EventListener, { passive: true });
      el.addEventListener('MozMousePixelScroll', onMozMousePixelScroll as EventListener, { passive: false });

      wheelCleanup = () => {
        el.removeEventListener('wheel', onRawWheel as EventListener);
        el.removeEventListener('DOMMouseScroll', onFireFoxScroll as unknown as EventListener);
        el.removeEventListener('MozMousePixelScroll', onMozMousePixelScroll as EventListener);
      };

      scrollDrag.register();
    });

    onUnmounted(() => {
      wheelCleanup?.();
      scrollDrag.unregister();
    });

    watch([() => holderSize.value.width, () => props.scrollWidth], () => {
      if (props.scrollWidth) {
        const newOffsetLeft = keepInHorizontalRange(offsetLeft.value);
        offsetLeft.value = newOffsetLeft;
        triggerScroll({ x: newOffsetLeft });
      }
    }, { flush: 'post' });

    // ================================= Ref ==================================
    function delayHideScrollBar() {
      verticalScrollBarRef.value?.delayHidden();
      horizontalScrollBarRef.value?.delayHidden();
    }

    const scrollTo = useScrollTo(
      componentRef,
      () => mergedData.value,
      heights,
      () => props.itemHeight ?? 0,
      getKey,
      () => collectHeight(true),
      syncScrollTop,
      delayHideScrollBar,
    );

    expose({
      get nativeElement() { return containerRef.value!; },
      getScrollInfo: getVirtualScrollInfo,
      scrollTo(config?: number | ScrollConfig | null) {
        if (config === null || config === undefined) { delayHideScrollBar(); return; }
        function isPosScroll(arg: any): arg is ScrollPos {
          return arg && typeof arg === 'object' && ('left' in arg || 'top' in arg);
        }
        if (isPosScroll(config)) {
          if ((config as ScrollPos).left !== undefined) offsetLeft.value = keepInHorizontalRange((config as ScrollPos).left!);
          scrollTo((config as ScrollPos).top ?? 0);
        } else {
          scrollTo(config as number | ScrollTarget);
        }
      },
    } satisfies GridRef);

    watch([start, end, mergedData], () => {
      if (props.onVisibleChange) {
        props.onVisibleChange(mergedData.value.slice(start.value, end.value + 1), mergedData.value);
      }
    }, { flush: 'post' });

    // ================================ Render ================================
    return () => {
      const colCount = calculatedColumnCount.value;
      const colWidth = calculatedColumnWidth.value;
      const rowHeight = props.itemHeight || 0;
      const gap = props.gap ?? 0;
      const pitch = rowHeight + gap;      // row-to-row distance
      const colPitch = colWidth + gap;    // col-to-col distance
      const rows = totalRows.value;

      // Total dimensions with gap
      const gridContainerHeight = rows > 0 ? rows * rowHeight + Math.max(0, rows - 1) * gap : 0;
      const gridContainerWidth = colCount > 0 ? colCount * colWidth + Math.max(0, colCount - 1) * gap : 0;

      // Start row of the currently rendered batch — items are positioned relative to this
      const startRow = Math.floor(start.value / colCount);

      const mergedClassName = clsx(props.prefixCls, { [`${props.prefixCls}-rtl`]: isRTL.value }, props.class);

      let componentStyle: CSSProperties | null = null;
      if (props.height) {
        componentStyle = {
          [props.fullHeight ? 'height' : 'maxHeight']: `${props.height}px`,
          overflowY: 'auto',
          overflowAnchor: 'none',
          position: 'relative',
        };
        if (useVirtual.value) {
          componentStyle.overflowY = 'hidden';
          if (props.scrollWidth) componentStyle.overflowX = 'hidden';
          if (scrollMoving.value) componentStyle.pointerEvents = 'none';
        }
      }

      // Render visible grid items with positions relative to the filler group start.
      // The Filler applies translateY(fillerOffset) so the group is shifted to the
      // correct scroll position. Items use (row - startRow) so there is no double-offset.
      //
      // The wrapper div owns the absolute placement; the slot only receives cell
      // dimensions so that spreading `style` inside the slot doesn't create a second
      // absolutely-positioned element at the same coordinates.
      const gridChildren = mergedData.value
        .slice(start.value, end.value + 1)
        .map((item, i) => {
          const eleIndex = start.value + i;
          const row = Math.floor(eleIndex / colCount);
          const col = eleIndex % colCount;
          const key = getKey(item);

          // Wrapper handles placement; slot gets only size so spreads don't double-position
          const wrapperStyle: CSSProperties = {
            position: 'absolute',
            top: `${(row - startRow) * pitch}px`,
            left: `${col * colPitch}px`,
            width: `${colWidth}px`,
            height: `${rowHeight}px`,
          };
          const slotStyle: CSSProperties = { width: `${colWidth}px`, height: `${rowHeight}px` };

          const slotVnodes = slots.default?.({ item, index: eleIndex, style: slotStyle, offsetX: 0 });

          return h('div', {
            key: String(key),
            style: wrapperStyle,
          }, slotVnodes ?? []);
        });

      const containerAttrs: Record<string, unknown> = {};
      if (isRTL.value) containerAttrs.dir = 'rtl';

      return h(
        'div',
        {
          ref: containerRef,
          style: { ...(typeof props.style === 'object' ? props.style : {}), position: 'relative' },
          class: mergedClassName,
          ...containerAttrs,
        },
        [
          h('div', {
            class: `${props.prefixCls}-holder`,
            style: componentStyle,
            ref: (el: ComponentPublicInstance | Element | null) => {
              componentRef.value = el as HTMLDivElement | null;
              if (el) setupHolderResizeObserver(el as HTMLElement);
            },
            onScroll: onFallbackScroll,
            onMouseenter: delayHideScrollBar,
          }, [
            h(Filler, {
              prefixCls: props.prefixCls,
              height: gridContainerHeight,
              offsetX: offsetLeft.value,
              offsetY: fillerOffset.value,
              onInnerResize: collectHeight,
              ref: fillerInnerRef,
              innerProps: props.innerProps,
              rtl: isRTL.value,
            }, {
              default: () => [
                h('div', {
                  style: { position: 'relative', height: `${gridContainerHeight}px`, width: `${gridContainerWidth}px` },
                }, gridChildren),
              ],
            }),
          ]),

          inVirtual.value && (scrollHeight.value ?? 0) > props.height!
            ? h(ScrollBar, {
                ref: verticalScrollBarRef,
                prefixCls: props.prefixCls,
                scrollOffset: offsetTop.value,
                scrollRange: scrollHeight.value ?? 0,
                rtl: isRTL.value,
                onScroll: onScrollBar,
                onStartMove: () => { scrollMoving.value = true; },
                onStopMove: () => { scrollMoving.value = false; },
                spinSize: verticalScrollBarSpinSize.value,
                containerSize: holderSize.value.height,
                style: props.styles?.verticalScrollBar,
                thumbStyle: props.styles?.verticalScrollBarThumb,
                showScrollBar: props.showScrollBar,
              })
            : null,

          inVirtual.value && (props.scrollWidth ?? 0) > holderSize.value.width
            ? h(ScrollBar, {
                ref: horizontalScrollBarRef,
                prefixCls: props.prefixCls,
                scrollOffset: offsetLeft.value,
                scrollRange: props.scrollWidth!,
                rtl: isRTL.value,
                onScroll: onScrollBar,
                onStartMove: () => { scrollMoving.value = true; },
                onStopMove: () => { scrollMoving.value = false; },
                spinSize: horizontalScrollBarSpinSize.value,
                containerSize: holderSize.value.width,
                horizontal: true,
                style: props.styles?.horizontalScrollBar,
                thumbStyle: props.styles?.horizontalScrollBarThumb,
                showScrollBar: props.showScrollBar,
              })
            : null,
        ],
      );
    };
  },
});

export default Grid;
