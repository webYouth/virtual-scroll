import type { CSSProperties, VNode } from 'vue';

export type Key = string | number | symbol;

export type RenderFunc<T> = (
  item: T,
  index: number,
  props: { style: CSSProperties; offsetX: number },
) => VNode | VNode[] | null;

export interface SharedConfig<T> {
  getKey: (item: T) => Key;
}

export type GetKey<T> = (item: T) => Key;

export type GetSize = (startKey: Key, endKey?: Key) => { top: number; bottom: number };

export interface ExtraRenderInfo {
  start: number;
  end: number;
  virtual: boolean;
  offsetX: number;
  offsetY: number;
  rtl: boolean;
  getSize: GetSize;
}

export interface ScrollInfo {
  x: number;
  y: number;
}
