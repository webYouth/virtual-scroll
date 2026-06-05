import raf from '@rc-component/util/lib/raf';
import { clsx } from 'clsx';
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue';
import { getPageXY } from './composables/useScrollDrag';

export type ScrollBarDirectionType = 'ltr' | 'rtl';

export interface ScrollBarExposed {
  delayHidden: () => void;
}

export const ScrollBar = defineComponent({
  name: 'VirtualScrollBar',

  props: {
    prefixCls: { type: String, required: true },
    scrollOffset: { type: Number, required: true },
    scrollRange: { type: Number, required: true },
    rtl: { type: Boolean, default: false },
    onScroll: { type: Function as PropType<(offset: number, horizontal?: boolean) => void>, required: true },
    onStartMove: { type: Function as PropType<() => void>, required: true },
    onStopMove: { type: Function as PropType<() => void>, required: true },
    horizontal: { type: Boolean, default: false },
    style: Object as PropType<CSSProperties>,
    thumbStyle: Object as PropType<CSSProperties>,
    spinSize: { type: Number, required: true },
    containerSize: { type: Number, required: true },
    showScrollBar: { type: [Boolean, String] as PropType<boolean | 'optional'>, default: 'optional' },
  },

  setup(props, { expose }) {
    const dragging = ref(false);
    const pageXY = ref<number | null>(null);
    const startTop = ref<number | null>(null);
    const visible = ref<boolean | 'optional'>(props.showScrollBar);

    const scrollbarRef = ref<HTMLDivElement | null>(null);
    const thumbRef = ref<HTMLDivElement | null>(null);

    let visibleTimeout: ReturnType<typeof setTimeout> | null = null;

    const isLTR = computed(() => !props.rtl);

    const enableScrollRange = computed(() => props.scrollRange - props.containerSize || 0);
    const enableOffsetRange = computed(() => props.containerSize - props.spinSize || 0);

    const top = computed(() => {
      if (props.scrollOffset === 0 || enableScrollRange.value === 0) return 0;
      const ptg = props.scrollOffset / enableScrollRange.value;
      return ptg * enableOffsetRange.value;
    });

    const stateRef = { top: 0, dragging: false, pageY: null as number | null, startTop: null as number | null };

    watch(
      () => [top.value, dragging.value, pageXY.value, startTop.value] as const,
      ([t, d, p, s]) => {
        stateRef.top = t;
        stateRef.dragging = d;
        stateRef.pageY = p;
        stateRef.startTop = s;
      },
    );

    function delayHidden() {
      if (props.showScrollBar === true || props.showScrollBar === false) return;
      if (visibleTimeout !== null) clearTimeout(visibleTimeout);
      visible.value = true;
      visibleTimeout = setTimeout(() => {
        visible.value = false;
      }, 3000);
    }

    function onThumbMouseDown(e: MouseEvent | TouchEvent) {
      dragging.value = true;
      pageXY.value = getPageXY(e, props.horizontal);
      startTop.value = stateRef.top;
      props.onStartMove();
      e.stopPropagation();
      e.preventDefault();
    }

    // Drag logic
    let moveRafId: number | null = null;

    watch(dragging, (isDragging) => {
      if (!isDragging) return;

      const enableScrollRangeSnap = enableScrollRange.value;
      const enableOffsetRangeSnap = enableOffsetRange.value;

      const onMouseMove = (e: MouseEvent | TouchEvent) => {
        if (moveRafId !== null) raf.cancel(moveRafId);

        const rect = scrollbarRef.value?.getBoundingClientRect();
        const scale = props.containerSize / (props.horizontal ? rect?.width ?? 0 : rect?.height ?? 0);

        if (stateRef.dragging) {
          const offset = (getPageXY(e, props.horizontal) - (stateRef.pageY ?? 0)) * scale;
          let newTop = stateRef.startTop ?? 0;

          if (!isLTR.value && props.horizontal) {
            newTop -= offset;
          } else {
            newTop += offset;
          }

          const ptg = enableOffsetRangeSnap ? newTop / enableOffsetRangeSnap : 0;
          let newScrollTop = Math.ceil(ptg * (enableScrollRange.value ?? 0));
          newScrollTop = Math.max(newScrollTop, 0);
          newScrollTop = Math.min(newScrollTop, enableScrollRange.value ?? 0);

          moveRafId = raf(() => {
            props.onScroll(newScrollTop, props.horizontal);
          });
        }
      };

      const onMouseUp = () => {
        dragging.value = false;
        props.onStopMove();
      };

      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('touchmove', onMouseMove, { passive: true });
      window.addEventListener('mouseup', onMouseUp, { passive: true });
      window.addEventListener('touchend', onMouseUp, { passive: true });

      const cleanup = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchend', onMouseUp);
        if (moveRafId !== null) raf.cancel(moveRafId);
      };

      // Watch for dragging to stop to cleanup
      const stop = watch(dragging, (val) => {
        if (!val) {
          cleanup();
          stop();
        }
      });
    });

    // Show scrollbar on scroll offset change
    watch(() => props.scrollOffset, delayHidden);

    onMounted(() => {
      const scrollbarEle = scrollbarRef.value;
      const thumbEle = thumbRef.value;

      const onScrollbarTouchStart = (e: TouchEvent) => {
        e.preventDefault();
      };

      scrollbarEle?.addEventListener('touchstart', onScrollbarTouchStart, { passive: false });
      thumbEle?.addEventListener('touchstart', onThumbMouseDown as EventListener, { passive: false });

      onUnmounted(() => {
        scrollbarEle?.removeEventListener('touchstart', onScrollbarTouchStart);
        thumbEle?.removeEventListener('touchstart', onThumbMouseDown as EventListener);
        if (visibleTimeout !== null) clearTimeout(visibleTimeout);
      });
    });

    expose({ delayHidden } satisfies ScrollBarExposed);

    return () => {
      const scrollbarPrefixCls = `${props.prefixCls}-scrollbar`;

      const containerStyle: CSSProperties = {
        position: 'absolute',
        visibility: visible.value ? undefined : 'hidden',
      };

      const thumbStyleObj: CSSProperties = {
        position: 'absolute',
        borderRadius: 99,
        background: 'var(--rc-virtual-list-scrollbar-bg, rgba(0, 0, 0, 0.5))',
        cursor: 'pointer',
        userSelect: 'none',
      };

      if (props.horizontal) {
        Object.assign(containerStyle, { height: '8px', left: 0, right: 0, bottom: 0 });
        Object.assign(thumbStyleObj, {
          height: '100%',
          width: `${props.spinSize}px`,
          [isLTR.value ? 'left' : 'right']: `${top.value}px`,
        });
      } else {
        Object.assign(containerStyle, {
          width: '8px',
          top: 0,
          bottom: 0,
          [isLTR.value ? 'right' : 'left']: 0,
        });
        Object.assign(thumbStyleObj, {
          width: '100%',
          height: `${props.spinSize}px`,
          top: `${top.value}px`,
        });
      }

      return h(
        'div',
        {
          ref: scrollbarRef,
          class: clsx(scrollbarPrefixCls, {
            [`${scrollbarPrefixCls}-horizontal`]: props.horizontal,
            [`${scrollbarPrefixCls}-vertical`]: !props.horizontal,
            [`${scrollbarPrefixCls}-visible`]: visible.value,
          }),
          style: { ...containerStyle, ...(props.style || {}) },
          onMousedown: (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
          },
          onMousemove: delayHidden,
        },
        [
          h('div', {
            ref: thumbRef,
            class: clsx(`${scrollbarPrefixCls}-thumb`, {
              [`${scrollbarPrefixCls}-thumb-moving`]: dragging.value,
            }),
            style: { ...thumbStyleObj, ...(props.thumbStyle || {}) },
            onMousedown: onThumbMouseDown as EventListener,
          }),
        ],
      );
    };
  },
});

export default ScrollBar;
