import ResizeObserver from '@rc-component/resize-observer';
import { clsx } from 'clsx';
import {type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode} from 'react';

export type InnerProps = Pick<HTMLAttributes<HTMLDivElement>, 'role' | 'id'>;

interface FillerProps {
  prefixCls?: string;
  /** Virtual filler height. Should be `count * itemMinHeight` */
  height: number;
  /** Set offset of visible items. Should be the top of start item position */
  offsetY?: number;
  offsetX?: number;

  scrollWidth?: number;

  children: ReactNode;

  onInnerResize?: () => void;

  innerProps?: InnerProps;

  rtl: boolean;

  extra?: ReactNode;
}

const Filler = forwardRef<HTMLDivElement, FillerProps>(
  (
    {
      height,
      offsetY,
      offsetX,
      children,
      prefixCls,
      onInnerResize,
      innerProps,
      rtl,
      extra,
    },
    ref,
  ) => {
	  let outerStyle: CSSProperties = {};
	  
	  let innerStyle: CSSProperties = {
		  display: 'flex',
		  flexDirection: 'column',
	  };
	  
	  if (offsetY !== undefined) {
		  // Not set `width` since this will break `sticky: right`
		  outerStyle = {
			  height,
			  position: 'relative',
			  overflow: 'hidden',
		  };
		  
		  innerStyle = {
			  ...innerStyle,
			  transform: `translateY(${offsetY}px)`,
			  // biome-ignore lint/style/noNonNullAssertion: <explanation>
			  [rtl ? 'marginRight' : 'marginLeft']: -offsetX!,
			  position: 'absolute',
			  left: 0,
			  right: 0,
			  top: 0,
		  };
	  }
		
	  return (
		  <div style={outerStyle}>
			  <ResizeObserver
				  onResize={({ offsetHeight }) => {
					  if (offsetHeight && onInnerResize) {
						  onInnerResize();
					  }
				  }}
			  >
				  <div
					  style={innerStyle}
					  className={clsx({ [`${prefixCls}-holder-inner`]: prefixCls })}
					  ref={ref}
					  {...innerProps}
				  >
					  {children}
					  {extra}
				  </div>
			  </ResizeObserver>
		  </div>
	  );
  },
);

Filler.displayName = 'Filler';

export default Filler;
