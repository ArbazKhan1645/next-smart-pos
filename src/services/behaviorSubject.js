export class BehaviorSubject {
  constructor(initialValue) {
    this._value = initialValue;
    this._subscribers = new Set();
  }

  get value() {
    return this._value;
  }

  add(newValue) {
    this._value = newValue;
    for (const fn of this._subscribers) {
      try { fn(newValue); } catch (_) {}
    }
  }

  subscribe(fn) {
    this._subscribers.add(fn);
    try { fn(this._value); } catch (_) {}
    return () => this._subscribers.delete(fn);
  }

  close() {
    this._subscribers.clear();
  }
}
