type Host = Pick<Window, 'setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval' | 'requestAnimationFrame' | 'cancelAnimationFrame'> & { eval: (source: string) => unknown };
type Listener = EventListenerOrEventListenerObject;
type Entry = { target: EventTarget; type: string; listener: Listener; capture: boolean };
const captureOf = (options?: boolean | EventListenerOptions) => typeof options === 'boolean' ? options : Boolean(options?.capture);

/** Resources owned by one mounted story. Native clocks and callback ordering stay unchanged. */
export function createRuntimeResources(host: Host) {
  let disposed = false;
  const timeouts = new Set<number>();
  const intervals = new Set<number>();
  const frames = new Set<number>();
  const listeners: Entry[] = [];

  const setTimeout: Window['setTimeout'] = (handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (disposed) return 0;
    const id = host.setTimeout(() => {
      timeouts.delete(id);
      if (disposed) return;
      if (typeof handler === 'function') handler(...args);
      else host.eval(handler);
    }, delay);
    timeouts.add(id);
    return id;
  };
  const clearTimeout: Window['clearTimeout'] = id => {
    if (typeof id === 'number') { timeouts.delete(id); intervals.delete(id); }
    host.clearTimeout(id);
  };
  const setInterval: Window['setInterval'] = (handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (disposed) return 0;
    const id = host.setInterval(handler, delay, ...args);
    intervals.add(id);
    return id;
  };
  const clearInterval: Window['clearInterval'] = id => {
    if (typeof id === 'number') { intervals.delete(id); timeouts.delete(id); }
    host.clearInterval(id);
  };
  const requestAnimationFrame: Window['requestAnimationFrame'] = callback => {
    if (disposed) return 0;
    const id = host.requestAnimationFrame(time => {
      frames.delete(id);
      if (!disposed) callback(time);
    });
    frames.add(id);
    return id;
  };
  const cancelAnimationFrame: Window['cancelAnimationFrame'] = id => { frames.delete(id); host.cancelAnimationFrame(id); };

  function listen(target: EventTarget, type: string, listener: Listener, options?: boolean | AddEventListenerOptions) {
    if (disposed) return;
    const capture = captureOf(options);
    target.addEventListener(type, listener, options);
    if (!listeners.some(e => e.target === target && e.type === type && e.listener === listener && e.capture === capture)) {
      listeners.push({target, type, listener, capture});
    }
  }
  function unlisten(target: EventTarget, type: string, listener: Listener, options?: boolean | EventListenerOptions) {
    const capture = captureOf(options);
    target.removeEventListener(type, listener, options);
    const index = listeners.findIndex(e => e.target === target && e.type === type && e.listener === listener && e.capture === capture);
    if (index >= 0) listeners.splice(index, 1);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const id of timeouts) host.clearTimeout(id);
    for (const id of intervals) host.clearInterval(id);
    for (const id of frames) host.cancelAnimationFrame(id);
    timeouts.clear(); intervals.clear(); frames.clear();
    for (const e of listeners) e.target.removeEventListener(e.type, e.listener, e.capture);
    listeners.length = 0;
  }
  return {setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, listen, unlisten, dispose};
}
