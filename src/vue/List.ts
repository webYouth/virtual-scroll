import { clsx } from 'clsx';
import {
  cloneVNode,
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

const EMPTY_DATA: never[] = [];

export type ScrollConfig = ScrollTarget | ScrollPos;
export type ScrollTo = (arg?: number | ScrollConfig | null) => void;

export interface ListRef {
  nativeElement: HTMLDivElement;
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
}

export const List = defineComponent({
  name: 'VirtualList',

  props: {
    prefixCls: { type: String, default: 'rc-virtual-list' },
    data: { type: Array as PropType<any[]>, default: () => [] },
    height: Number,
    itemHeight: Number,
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
    // =============================== Item Key ===============================
    function getKey(item: any): Key {
      if (typeof props.itemKey === 'function') {
        return props.itemKey(item);
      }
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
    const mergedData = computed(() => props.data || EMPTY_DATA);
    const isRTL = computed(() => props.direction === 'rtl');

    const useVirtual = computed(
      () => !!(props.virtual !== false && props.height && props.itemHeight),
    );

    const containerHeight = computed(() => {
      let total = 0;
      for (const val of Object.values(heights.maps)) total += val;
      return total;
    });

    const inVirtual = computed(
      () =>
        useVirtual.value &&
        mergedData.value.length > 0 &&
        (Math.max(props.itemHeight! * mergedData.value.length, containerHeight.value) > props.height! ||
          !!props.scrollWidth),
    );

    // ========================== Visible Calculation =========================
    const visibleRange = computed(() => {
      if (!useVirtual.value) {
        return {
          scrollHeight: undefined as number | undefined,
          start: 0,
          end: mergedData.value.length - 1,
          offset: undefined as number | undefined,
        };
      }

      if (!inVirtual.value) {
        return {
          scrollHeight: fillerInnerRef.value?.offsetHeight || 0,
          start: 0,
          end: mergedData.value.length - 1,
          offset: undefined as number | undefined,
        };
      }

      let itemTop = 0;
      let startIndex = -1;
      let startOffset = 0;
      let endIndex = -1;

      const dataLen = mergedData.value.length;
      for (let i = 0; i < dataLen; i++) {
        const item = mergedData.value[i];
        const key = getKey(item);
        const cacheHeight = heights.get(key);
        const currentItemBottom = itemTop + (cacheHeight === undefined ? props.itemHeight! : cacheHeight);

        if (currentItemBottom >= offsetTop.value && startIndex === -1) {
          startIndex = i;
          startOffset = itemTop;
        }

        if (currentItemBottom > offsetTop.value + props.height! && endIndex === -1) {
          endIndex = i;
        }

        itemTop = currentItemBottom;
      }

      if (startIndex === -1) {
        startIndex = 0;
        startOffset = 0;
        endIndex = Math.ceil(props.height! / props.itemHeight!);
      }

      if (endIndex === -1) {
        endIndex = mergedData.value.length - 1;
      }

      endIndex = Math.min(endIndex + 1, mergedData.value.length - 1);

      return {
        scrollHeight: itemTop,
        start: startIndex,
        end: endIndex,
        offset: startOffset,
      };
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
          holderSize.value = {
            width: target.offsetWidth,
            height: target.offsetHeight,
          };
        }
      });
      holderResizeObserver.observe(el);
    }

    onUnmounted(() => holderResizeObserver?.disconnect());

    // ============================== Spin Size ===============================
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
      if (!Number.isNaN(maxScrollHeight.value)) {
        newTop = Math.min(newTop, maxScrollHeight.value);
      }
      newTop = Math.max(newTop, 0);
      return newTop;
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
      if (componentRef.value) {
        componentRef.value.scrollTop = aligned;
      }
      offsetTop.value = aligned;
    }

    function getVirtualScrollInfo(): ScrollInfo {
      return {
        x: isRTL.value ? -offsetLeft.value : offsetLeft.value,
        y: offsetTop.value,
      };
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
      const { scrollTop: newScrollTop } = el;
      if (newScrollTop !== offsetTop.value) {
        syncScrollTop(newScrollTop);
      }
      props.onScroll?.(e);
      triggerScroll();
    }

    function onWheelDelta(offsetXY: number, fromHorizontal: boolean) {
      if (fromHorizontal) {
        const nextOffsetLeft = offsetLeft.value + (isRTL.value ? -offsetXY : offsetXY);
        offsetLeft.value = keepInHorizontalRange(nextOffsetLeft);
        triggerScroll();
      } else {
        syncScrollTop(offsetTop.value + offsetXY);
      }
    }

    // ============================== Wheel / Touch ===========================
    const [onRawWheel, onFireFoxScroll] = useFrameWheel(
      () => useVirtual.value,
      () => isScrollAtTop.value,
      () => isScrollAtBottom.value,
      () => isScrollAtLeft.value,
      () => isScrollAtRight.value,
      !!props.scrollWidth,
      onWheelDelta,
    );

    const touchMove = useMobileTouchMove(
      () => useVirtual.value,
      componentRef,
      (isHorizontal, delta, smoothOffset, e) => {
        const event = e as (TouchEvent & { _virtualHandled?: boolean }) | undefined;
        if (originScroll(isHorizontal, delta, smoothOffset ?? false)) return false;
        if (!event || !event._virtualHandled) {
          if (event) event._virtualHandled = true;
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

    const scrollDrag = useScrollDrag(
      () => inVirtual.value,
      () => componentRef.value,
      (offset) => syncScrollTop(offsetTop.value + offset),
    );

    // Register/unregister wheel & drag event listeners
    function registerWheelListeners() {
      const el = componentRef.value;
      if (!el) return;

      function onMozMousePixelScroll(e: WheelEvent) {
        const scrollingUpAtTop = isScrollAtTop.value && (e as any).detail < 0;
        const scrollingDownAtBottom = isScrollAtBottom.value && (e as any).detail > 0;
        if (useVirtual.value && !scrollingUpAtTop && !scrollingDownAtBottom) {
          e.preventDefault();
        }
      }

      el.addEventListener('wheel', onRawWheel as EventListener, { passive: false });
      el.addEventListener('DOMMouseScroll', onFireFoxScroll as unknown as EventListener, { passive: true });
      el.addEventListener('MozMousePixelScroll', onMozMousePixelScroll as EventListener, { passive: false });

      return () => {
        el.removeEventListener('wheel', onRawWheel as EventListener);
        el.removeEventListener('DOMMouseScroll', onFireFoxScroll as unknown as EventListener);
        el.removeEventListener('MozMousePixelScroll', onMozMousePixelScroll as EventListener);
      };
    }

    let wheelCleanup: (() => void) | undefined;

    onMounted(() => {
      wheelCleanup = registerWheelListeners();
      scrollDrag.register();
    });

    onUnmounted(() => {
      wheelCleanup?.();
      scrollDrag.unregister();
    });

    // Sync horizontal scroll when container width or scrollWidth changes
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
        if (config === null || config === undefined) {
          delayHideScrollBar();
          return;
        }
        function isPosScroll(arg: any): arg is ScrollPos {
          return arg && typeof arg === 'object' && ('left' in arg || 'top' in arg);
        }
        if (isPosScroll(config)) {
          if ((config as ScrollPos).left !== undefined) {
            offsetLeft.value = keepInHorizontalRange((config as ScrollPos).left!);
          }
          scrollTo((config as ScrollPos).top ?? 0);
        } else {
          scrollTo(config as number | ScrollTarget);
        }
      },
    } satisfies ListRef);

    // ================================ Effect ================================
    watch([start, end, mergedData], () => {
      if (props.onVisibleChange) {
        const renderList = mergedData.value.slice(start.value, end.value + 1);
        props.onVisibleChange(renderList, mergedData.value);
      }
    }, { flush: 'post' });

    // ================================ Render ================================
    return () => {
      const mergedClassName = clsx(props.prefixCls, {
        [`${props.prefixCls}-rtl`]: isRTL.value,
      }, props.class);

      let componentStyle: CSSProperties | null = null;
      if (props.height) {
        componentStyle = {
          [props.fullHeight ? 'height' : 'maxHeight']: `${props.height}px`,
          overflowY: 'auto',
          overflowAnchor: 'none',
        };
        if (useVirtual.value) {
          componentStyle.overflowY = 'hidden';
          if (props.scrollWidth) componentStyle.overflowX = 'hidden';
          if (scrollMoving.value) componentStyle.pointerEvents = 'none';
        }
      }

      // Render visible items using scoped slot
      const listChildren = mergedData.value
        .slice(start.value, end.value + 1)
        .map((item, i) => {
          const eleIndex = start.value + i;
          const key = getKey(item);
          const style: CSSProperties = props.scrollWidth ? { width: `${props.scrollWidth}px` } : {};

          const slotVnodes = slots.default?.({
            item,
            index: eleIndex,
            style,
            offsetX: offsetLeft.value,
          });

          if (!slotVnodes?.length) return null;

          return cloneVNode(slotVnodes[0], {
            key: String(key),
            ref: (el: ComponentPublicInstance | Element | null) =>
              setInstanceRef(item, el as HTMLElement | null),
          });
        })
        .filter(Boolean) as VNode[];

      const extraContent = props.extraRender?.({
        start: start.value,
        end: end.value,
        virtual: inVirtual.value,
        offsetX: offsetLeft.value,
        offsetY: fillerOffset.value ?? 0,
        rtl: isRTL.value,
        getSize: (startKey, endKey = startKey) => {
          const bottomList: number[] = [];
          const key2Index = new Map<Key, number>();
          const data = mergedData.value;
          let sIdx: number | undefined;
          let eIdx: number | undefined;
          for (let i = 0; i < data.length; i++) {
            const k = getKey(data[i]);
            key2Index.set(k, i);
            const h = heights.get(k) ?? props.itemHeight ?? 0;
            bottomList[i] = (bottomList[i - 1] || 0) + h;
            if (k === startKey) sIdx = i;
            if (k === endKey) eIdx = i;
            if (sIdx !== undefined && eIdx !== undefined) break;
          }
          return { top: bottomList[(sIdx ?? 0) - 1] || 0, bottom: bottomList[eIdx ?? 0] };
        },
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
          // Holder with ResizeObserver
          h(
            'div',
            {
              class: `${props.prefixCls}-holder`,
              style: componentStyle,
            ref: (el: ComponentPublicInstance | Element | null) => {
              componentRef.value = el as HTMLDivElement | null;
              if (el) setupHolderResizeObserver(el as HTMLElement);
            },
              onScroll: onFallbackScroll,
              onMouseenter: delayHideScrollBar,
            },
            [
              h(
                Filler,
                {
                  prefixCls: props.prefixCls,
                  height: scrollHeight.value ?? 0,
                  offsetX: offsetLeft.value,
                  offsetY: fillerOffset.value,
                  scrollWidth: props.scrollWidth,
                  onInnerResize: collectHeight,
                  ref: fillerInnerRef,
                  innerProps: props.innerProps,
                  rtl: isRTL.value,
                  extra: extraContent ?? undefined,
                },
                { default: () => listChildren },
              ),
            ],
          ),

          // Vertical scrollbar
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

          // Horizontal scrollbar
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

export default List;
