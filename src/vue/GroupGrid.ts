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
import { type ScrollPos, type ScrollTarget, useScrollTo } from './composables/useScrollTo';
import { ScrollBar, type ScrollBarExposed } from './ScrollBar';
import type { ExtraRenderInfo, GetKey, Key, ScrollInfo } from './interface';

export interface GroupItem<T> {
  key: Key;
  title?: string;
  children: T[];
}

export type ScrollConfig = ScrollTarget | ScrollPos;
export type ScrollTo = (arg?: number | ScrollConfig | null) => void;

export interface GroupGridRef {
  nativeElement: HTMLDivElement;
  scrollTo: ScrollTo;
  getScrollInfo: () => ScrollInfo;
}

export const GroupGrid = defineComponent({
  name: 'VirtualGroupGrid',

  props: {
    prefixCls: { type: String, default: 'rc-virtual-group-grid' },
    groups: { type: Array as PropType<GroupItem<any>[]>, default: () => [] },
    height: Number,
    itemHeight: { type: Number, default: 100 },
    itemWidth: Number,
    columnCount: Number,
    columnWidth: Number,
    gap: { type: Number, default: 0 },
    groupHeaderHeight: { type: Number, default: 40 },
    fullHeight: { type: Boolean, default: true },
    groupKey: { type: [String, Function] as PropType<Key | ((group: GroupItem<any>) => Key)>, required: true },
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
    groupHeaderRender: Function as PropType<(group: GroupItem<any>, index: number) => VNode | string | null>,
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

    // ========================== Key Helpers =================================
    function getGroupKey(group: GroupItem<any>): Key {
      if (typeof props.groupKey === 'function') return props.groupKey(group);
      return group?.[props.groupKey as keyof GroupItem<any>] as Key;
    }

    function getItemKey(item: any): Key {
      if (typeof props.itemKey === 'function') return props.itemKey(item);
      return item?.[props.itemKey as string];
    }

    // ================================ Height ================================
    const { setInstanceRef, collectHeight, heights, updatedMark } = useHeights(getItemKey);

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
    const mergedGroups = computed(() => props.groups || []);
    const isRTL = computed(() => props.direction === 'rtl');
    const itemHeight = computed(() => props.itemHeight ?? 100);
    const groupHeaderHeight = computed(() => props.groupHeaderHeight ?? 40);

    const useVirtual = computed(() => !!(props.virtual !== false && props.height));

    const containerHeight = computed(() => {
      if (!mergedGroups.value.length) return 0;
      const gap = props.gap ?? 0;
      return mergedGroups.value.reduce((total, group) => {
        const rows = Math.ceil(group.children.length / calculatedColumnCount.value);
        const groupItemsHeight = rows > 0 ? rows * itemHeight.value + Math.max(0, rows - 1) * gap : 0;
        return total + groupHeaderHeight.value + groupItemsHeight;
      }, 0);
    });

    const inVirtual = computed(
      () => useVirtual.value && mergedGroups.value.length > 0 && containerHeight.value > (props.height ?? 0),
    );

    // ========================== Visible Calculation =========================
    const visibleRange = computed(() => {
      if (!useVirtual.value) {
        return {
          scrollHeight: undefined as number | undefined,
          start: 0,
          end: mergedGroups.value.length - 1,
          offset: undefined as number | undefined,
          visibleGroups: mergedGroups.value.map((group, i) => ({ group, groupIndex: i, offsetY: 0 })),
        };
      }

      if (!inVirtual.value) {
        return {
          scrollHeight: fillerInnerRef.value?.offsetHeight || 0,
          start: 0,
          end: mergedGroups.value.length - 1,
          offset: undefined as number | undefined,
          visibleGroups: mergedGroups.value.map((group, i) => ({ group, groupIndex: i, offsetY: 0 })),
        };
      }

      if (!mergedGroups.value.length) {
        return { scrollHeight: 0, start: 0, end: -1, offset: 0, visibleGroups: [] };
      }

      const gap = props.gap ?? 0;

      let currentOffset = 0;
      let calculatedStart = -1;
      let calculatedEnd = -1;
      let calculatedStartOffset = 0;
      const visibleGroups: Array<{ group: GroupItem<any>; groupIndex: number; offsetY: number }> = [];

      for (let groupIndex = 0; groupIndex < mergedGroups.value.length; groupIndex++) {
        const group = mergedGroups.value[groupIndex];
        const rows = Math.ceil(group.children.length / calculatedColumnCount.value);
        const groupItemsHeight = rows > 0 ? rows * itemHeight.value + Math.max(0, rows - 1) * gap : 0;
        const groupHeight = groupHeaderHeight.value + groupItemsHeight;
        const groupEndOffset = currentOffset + groupHeight;

        if (calculatedStart === -1 && groupEndOffset > offsetTop.value) {
          calculatedStart = groupIndex;
          calculatedStartOffset = currentOffset;
        }

        if (calculatedEnd === -1 && groupEndOffset >= offsetTop.value + (props.height ?? 0)) {
          calculatedEnd = groupIndex;
        }

        if (currentOffset <= offsetTop.value + (props.height ?? 0) && groupEndOffset >= offsetTop.value) {
          visibleGroups.push({ group, groupIndex, offsetY: currentOffset });
        }

        currentOffset = groupEndOffset;
      }

      if (calculatedEnd === -1) calculatedEnd = mergedGroups.value.length - 1;

      return {
        scrollHeight: currentOffset,
        start: Math.max(0, calculatedStart),
        end: Math.min(mergedGroups.value.length - 1, calculatedEnd),
        offset: calculatedStartOffset,
        visibleGroups,
      };
    });

    const scrollHeight = computed(() => visibleRange.value.scrollHeight);
    const start = computed(() => visibleRange.value.start);
    const end = computed(() => visibleRange.value.end);
    const fillerOffset = computed(() => visibleRange.value.offset);
    const visibleGroups = computed(() => visibleRange.value.visibleGroups);

    // ========================= Scroll Jump Compensation =====================
    watch(scrollHeight, () => {
      const changedRecord = heights.getRecord();
      if (changedRecord.size === 1) {
        const recordKey = Array.from(changedRecord.keys())[0];
        const prevCacheHeight = changedRecord.get(recordKey);
        const firstVisible = visibleGroups.value[0];
        if (firstVisible?.group.children[0] && prevCacheHeight === undefined) {
          const firstItem = firstVisible.group.children[0];
          const startIndexKey = getItemKey(firstItem);
          if (startIndexKey === recordKey) {
            const realStartHeight = heights.get(recordKey);
            const diffHeight = realStartHeight - itemHeight.value;
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

    // Flatten visible items for scrollTo
    const allItems = computed(() => mergedGroups.value.flatMap((g) => g.children));

    const scrollTo = useScrollTo(
      componentRef,
      () => allItems.value,
      heights,
      () => itemHeight.value,
      getItemKey,
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
    } satisfies GroupGridRef);

    watch([start, end, visibleGroups], () => {
      if (props.onVisibleChange) {
        const visibleItems = visibleGroups.value.flatMap((vg) => vg.group.children);
        props.onVisibleChange(visibleItems, allItems.value);
      }
    }, { flush: 'post' });

    // ================================ Render ================================
    return () => {
      const colCount = calculatedColumnCount.value;
      const colWidth = calculatedColumnWidth.value;
      const iH = itemHeight.value;
      const gHH = groupHeaderHeight.value;
      const totalHeight = containerHeight.value;
      const gridWidth = colCount * colWidth;

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

      const gap = props.gap ?? 0;
      const pitch = iH + gap;        // row-to-row distance within a group
      const colPitch = colWidth + gap; // col-to-col distance

      // fillerOffset is the absolute Y of the first visible group.
      // All group elements are positioned relative to this value so that
      // the Filler's translateY(fillerOffset) brings them to the correct
      // scroll position without any double-offset.
      const fOffset = fillerOffset.value ?? 0;

      // Render visible groups with absolute positioning
      const groupElements: VNode[] = [];

      for (const { group, groupIndex, offsetY } of visibleGroups.value) {
        const gKey = getGroupKey(group);

        // Convert absolute offsetY to a position relative to the filler start
        const relOffsetY = offsetY - fOffset;

        // Group header
        const headerContent = props.groupHeaderRender
          ? props.groupHeaderRender(group, groupIndex)
          : (slots.header?.({ group, index: groupIndex }) ?? group.title ?? `Group ${groupIndex + 1}`);

        groupElements.push(
          h('div', {
            key: `header-${String(gKey)}`,
            style: {
              position: 'absolute',
              top: `${relOffsetY}px`,
              left: 0,
              width: '100%',
              height: `${gHH}px`,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '10px',
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #e8e8e8',
              boxSizing: 'border-box',
            },
          }, [typeof headerContent === 'string' ? headerContent : headerContent]),
        );

        // Group items — position relative to the start of this group's item area
        const itemsBaseY = relOffsetY + gHH;
        group.children.forEach((item, itemIndex) => {
          const row = Math.floor(itemIndex / colCount);
          const col = itemIndex % colCount;
          const iKey = getItemKey(item);
          const globalIndex = groupIndex * 100000 + itemIndex;

          // Wrapper handles absolute placement; slot receives only cell size
          const wrapperStyle: CSSProperties = {
            position: 'absolute',
            top: `${itemsBaseY + row * pitch}px`,
            left: `${col * colPitch}px`,
            width: `${colWidth}px`,
            height: `${iH}px`,
          };
          const slotStyle: CSSProperties = { width: `${colWidth}px`, height: `${iH}px` };

          const slotVnodes = slots.default?.({ item, index: globalIndex, style: slotStyle, offsetX: 0 });

          groupElements.push(
            h('div', {
              key: `item-${String(gKey)}-${String(iKey)}`,
              style: wrapperStyle,
            }, slotVnodes ?? []),
          );
        });
      }

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
              height: totalHeight,
              offsetX: offsetLeft.value,
              offsetY: fillerOffset.value,
              onInnerResize: collectHeight,
              ref: fillerInnerRef,
              innerProps: props.innerProps,
              rtl: isRTL.value,
            }, {
              default: () => [
                h('div', {
                  style: { position: 'relative', height: `${totalHeight}px`, width: `${gridWidth}px` },
                }, groupElements),
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

export default GroupGrid;
