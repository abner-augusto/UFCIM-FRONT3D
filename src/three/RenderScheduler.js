export class RenderScheduler {
  constructor(render, request = callback => requestAnimationFrame(callback), cancel = frame => cancelAnimationFrame(frame)) {
    this.render = render;
    this.request = request;
    this.cancel = cancel;
    this.pauses = new Set();
    this.frame = null;
    this.dirty = false;
    this.disposed = false;
  }

  invalidate() {
    this.dirty = true;
    if (this.disposed || this.pauses.size || this.frame !== null) return;
    this.frame = this.request(() => {
      this.frame = null;
      if (this.disposed || this.pauses.size || !this.dirty) return;
      this.dirty = false;
      this.render();
    });
  }

  setPaused(reason, paused) {
    if (paused) {
      this.pauses.add(reason);
      if (this.frame !== null) this.cancel(this.frame);
      this.frame = null;
    } else {
      this.pauses.delete(reason);
      if (this.dirty) this.invalidate();
    }
  }

  dispose() {
    this.disposed = true;
    if (this.frame !== null) this.cancel(this.frame);
    this.frame = null;
  }
}

export function observeContainer(canvas, onResize) {
  const observer = new ResizeObserver(onResize);
  observer.observe(canvas.parentElement || canvas);
  return observer;
}

