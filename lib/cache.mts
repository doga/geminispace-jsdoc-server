import { Gemtext, LineText } from "../deps.mts";
import { convert, Effect } from "./text-effects.mts";
const _ = new LineText('');

type Value = {
  bytes    : Uint8Array,
  timestamp: Date,
};

class Cache { // BUG use Deno KV to be able to serve multiple requests at the same time without race conditions (or make sure that all content is cached at startup time)
  #maxSize: number;
  #size: number;
  #cache = new Map<string, Value>();
  #lru = new Array<string>(); // Most recently accessed path is first

  #encoder = new TextEncoder();

  /**
   * Creates an in-memory Gemtext cache.
   * @param {number | undefined} size Cache size. Unit is 10_000 bytes. Default is 100.
   */
  constructor(size?: number) {
    size = Math.floor(size ?? 100);
    if(size<1)size = 1;
    size = size * 10_000;
    // console.debug(`Setting cache size to ${size} bytes`);
    this.#maxSize = size;
    this.#size = 0;
  }


  set(path: string, gemtext: Gemtext):boolean {
    try {
      const 
      timestamp = convert(`Cached on ${new Date()}`, Effect.MathematicalSansSerifItalic),
      lines = [
        _,
        // new LineText('————————————————————'),
        // new LineText('In-memory cache:'),
        new LineText(`📅 ${timestamp}`),
      ];
      gemtext.append(...lines);
      const bytes: Uint8Array = this.#encoder.encode(gemtext.string);

      this._purge(path, bytes.length);
      this.#cache.set(path, {bytes, timestamp: new Date()});
      this.#lru.unshift(path);

      return true;
    } catch (_error) {
      return false;
    }
  }


  get(path: string): Value | null {
    try {
      this._touch(path);
      return this.#cache.get(path) || null;
    } catch (_error) {
      return null;
    }
  }

  _touch(path: string){
    if(!this.#cache.has(path))throw new TypeError('unknown path');
    this.#lru = this.#lru.filter(p => p !== path);
    this.#lru.unshift(path);
  }


  _purge(path: string, bytesToFree: number) {
    let freed = 0;

    // remove stored bytes for this path
    if (this.#cache.has(path)) {
      const v = this.#cache.get(path);

      if (v) {
        this.#cache.delete(path);
        this.#lru = this.#lru.filter(p => p !== path);
        this.#size -= v.bytes.length;
        freed += v.bytes.length;
      }
    }

    if(bytesToFree > this.#maxSize)throw new TypeError('uncacheable');
    if(bytesToFree <= this.#maxSize - this.#size)return;

    // remove stored bytes for other paths
    while (freed < bytesToFree && this.#cache.size > 0) {
      const
      p = this.#lru[0],
      v = this.#cache.get(p);

      if (v) {
        this.#lru.pop();
        this.#cache.delete(p);
        this.#size -= v.bytes.length;
        freed += v.bytes.length;
      }
    }
  }

}

export type {Value};
export {Cache};
