
const {floor} = Math;

export class Queue {
  static node(value, next = null) {
    return {value, next};
  }

  constructor(init = []) {
    // values move through the "digestive track" from head to ass

    // don't mess directly with any of these properties, seriously
    this._head = null;
    this._ass = null;
    this._length = 0;

    for (let item of init) {
      this.enqueue(item);
    }
  }

  // eat a value in the head of the queue
  enqueue(value) {
    if (this._length === 0) {
      this._ass = this._head = this.constructor.node(value);
    } else {
      this._head.next = this.constructor.node(value);
      this._head = this._head.next;
    }

    this._length++;
  }

  // crap a value out the ass of the queue
  dequeue() {
    const value = this.peek();

    this._ass = this._ass.next;
    if (this._length === 1)
      this._head = null;
    this._length--;

    return value;
  }

  peek(n = 0) {
    if (n >= this._length) {
      throw new Error('Peeking or dequeuing out of bounds!');
    } else {
      let node = this._ass;
      for (let i = 0; i < n; i++) {
        node = node.next;
      }

      return node.value;
    }
  }

  get length() {
    return this._length;
  }
}

export class CachedQueue extends Queue {
  constructor(init = [], caching = 2) {
    super(init);

    this._base = 0;
    this._cache = new Map();
  }

  enqueue(value) {
    super.enqueue(value);
    if ((this._length + this._base - 1) % this._caching === 0) {
      this._cache.set(this._length + this._base - 1, this._head);
    }
  }

  dequeue() {
    if ((this._length + this._base) % this._caching === 0) {
      this._cache.delete(this._length + this._base);
    }

    return super.dequeue();
  }

  peek(n = 0) {
    const position = this._base + n;
    const floor = this._caching * Math.floor(position / this._caching);

    if (this._cache.has(floor)) {
      let node = this._cache.get(floor);
      for (let i = floor; i < position; i++) {
        node = node.next;
      }

      return node.value;
    } else {
      return super.peek(n);
    }
  }
}

export class Stack {
  static node(value, prev) {
    return {value, prev};
  }

  constructor(init = [], caching = 0) {
    // values move through the "digestive track" from head to ass

    // don't mess directly with any of these properties, seriously
    this._head = null;
    this._length = 0;

    for (let value in init) {
      this.push(value);
    }
  }
  
  push(value) {
    this._head = this.constructor.node(value, this._head);
    this._length++;
  }

  pop() {
    const val = this.peek();

    this._head = this._head.prev;
    this._length--;
    return val;
  }

  peek(n = 0) {
    if (n >= this._length) {
      throw new Error('Cannot peek or pop empty stack!');                        
    } else {
      let node = this._head;
      for (let i = 0; i < n; i++) {
        node = node.prev;
      }

      return node.value;
    }
  }

  * rewind() {
    let node = this._head;
    
    while (node !== null) {
      yield node.value;
      
      node = node.prev;
    }
  }
  
  get length() {
    return this._length;
  }
}

export class DropoutStack extends Stack {
  static node(value, prev = null, next = null) {
    return {value, prev, next};
  }

  _drop() {
    while (this._length > this._size) {
      if (this._length === 0)
        this._ass = this._prev = null;
      else {
        this._ass = this._ass.next;
        this._ass.prev = null;
      }

      this._length--;
    }
  }

  constructor(size, init = []) {
    super(init);

    this._size = size;
    this._ass = null;
  
    this._drop();
  }

  push(value) {
    super.push(value);
    if (this._length === 1) {
      this._ass = this._head;
    } else {
      this._head.prev.next = this._head;
    }

    this._drop();
  }

  get size() {
    return this._size;
  }

  set size(n) {
    this._size = n;
    
    this._drop();
  }
}
