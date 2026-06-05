// Framework-agnostic key type: compatible with React.Key (string|number|bigint) and Vue's VNodeKey (string|number|symbol)
export type CacheKey = string | number | symbol | bigint;

// Firefox has low performance of map.
class CacheMap {
  maps: Record<string, number>;

  // Used for cache key
  id: number = 0;

  diffRecords = new Map<CacheKey, number>();

  constructor() {
    this.maps = Object.create(null);
  }

  set(key: CacheKey, value: number) {
    // Record prev value
    this.diffRecords.set(key, this.maps[key as string]);

    this.maps[key as string] = value;
    this.id += 1;
  }

  get(key: CacheKey) {
    return this.maps[key as string];
  }

  /**
   * CacheMap will record the key changed.
   * To help to know what's update in the next render.
   */
  resetRecord() {
    this.diffRecords.clear();
  }

  getRecord() {
    return this.diffRecords;
  }
}

export default CacheMap;
