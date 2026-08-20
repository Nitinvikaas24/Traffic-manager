// Binary min-heap priority queue used by Dijkstra and A*.
class MinHeap {
  constructor() {
    this.heap = []; // { value, priority }
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  push(value, priority) {
    this.heap.push({ value, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return top.value;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.heap[parent].priority <= this.heap[index].priority) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  _bubbleDown(index) {
    const n = this.heap.length;
    for (;;) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

export default MinHeap;
