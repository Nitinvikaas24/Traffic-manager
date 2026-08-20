import { describe, it, expect } from 'vitest';
import MinHeap from './minHeap';

describe('MinHeap', () => {
  it('pops values in ascending priority order regardless of insertion order', () => {
    const heap = new MinHeap();
    const entries = [
      ['e', 5],
      ['a', 1],
      ['d', 4],
      ['b', 2],
      ['c', 3],
    ];
    entries.forEach(([value, priority]) => heap.push(value, priority));

    const popped = [];
    while (!heap.isEmpty()) {
      popped.push(heap.pop());
    }

    expect(popped).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('handles duplicate priorities without losing entries', () => {
    const heap = new MinHeap();
    heap.push('x', 1);
    heap.push('y', 1);
    heap.push('z', 1);

    const popped = new Set();
    while (!heap.isEmpty()) popped.add(heap.pop());

    expect(popped).toEqual(new Set(['x', 'y', 'z']));
  });

  it('isEmpty/size reflect the current contents and pop() on empty returns undefined', () => {
    const heap = new MinHeap();
    expect(heap.isEmpty()).toBe(true);
    expect(heap.pop()).toBeUndefined();

    heap.push('only', 10);
    expect(heap.isEmpty()).toBe(false);
    expect(heap.size()).toBe(1);
    expect(heap.pop()).toBe('only');
    expect(heap.isEmpty()).toBe(true);
  });
});
