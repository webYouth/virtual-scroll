import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type ComponentPublicInstance,
  type CSSProperties,
  type PropType,
  type VNode,
} from 'vue';

export interface InnerProps {
  role?: string;
  id?: string;
}

export const Filler = defineComponent({
  name: 'VirtualFiller',

  props: {
    prefixCls: String,
    height: { type: Number, required: true },
    offsetY: Number,
    offsetX: Number,
    scrollWidth: Number,
    onInnerResize: Function as PropType<() => void>,
    innerProps: Object as PropType<InnerProps>,
    rtl: { type: Boolean, default: false },
    extra: Object as PropType<VNode | null>,
  },

  emits: ['innerResize'],

  setup(props, { slots, expose }) {
    let resizeObserver: ResizeObserver | null = null;
    let innerEl: HTMLDivElement | null = null;

    function handleResize(entries: ResizeObserverEntry[]) {
      for (const entry of entries) {
        const { offsetHeight } = entry.target as HTMLElement;
        if (offsetHeight && props.onInnerResize) {
          props.onInnerResize();
        }
      }
    }

    function mountObserver(el: HTMLDivElement) {
      innerEl = el;
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(el);
    }

    function unmountObserver() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    }

    onUnmounted(unmountObserver);

    return () => {
      let outerStyle: CSSProperties = {};
      let innerStyle: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
      };

      if (props.offsetY !== undefined) {
        outerStyle = {
          height: `${props.height}px`,
          position: 'relative',
          overflow: 'hidden',
        };

        innerStyle = {
          ...innerStyle,
          transform: `translateY(${props.offsetY}px)`,
          [props.rtl ? 'marginRight' : 'marginLeft']: props.offsetX !== undefined ? `${-props.offsetX}px` : undefined,
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
        };
      }

      const innerCls = props.prefixCls ? `${props.prefixCls}-holder-inner` : undefined;

      return h('div', { style: outerStyle }, [
        h(
          'div',
          {
            style: innerStyle,
            class: innerCls,
            ...(props.innerProps || {}),
            ref: (el: ComponentPublicInstance | Element | null) => {
              const domEl = el as HTMLDivElement | null;
              if (domEl && domEl !== innerEl) {
                mountObserver(domEl);
              } else if (!domEl) {
                unmountObserver();
              }
            },
          },
          [
            ...(slots.default?.() ?? []),
            props.extra ? props.extra : null,
          ],
        ),
      ]);
    };
  },
});

export default Filler;
