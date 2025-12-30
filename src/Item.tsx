import { cloneElement, type ReactElement, useCallback } from 'react';

export interface ItemProps {
  children: ReactElement;
  setRef: (element: HTMLElement | null) => void;
}

export function Item({ children, setRef }: ItemProps) {
  const existingRef = (children as any).ref;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const refCallback = useCallback((node: HTMLElement | null) => {
    setRef(node);

    if (typeof existingRef === 'function') {
      existingRef(node);
    } else if (existingRef && typeof existingRef === 'object') {
      existingRef.current = node;
    }
  }, [existingRef])

  return cloneElement(children, {
    // @ts-expect-error
    ref: refCallback,
  });
}
