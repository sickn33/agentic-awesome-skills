(function (root) {
  function create(worker) {
    let active = null, pending = null, timer = null, failure = null, requestId = 0;
    const exports = [];

    function superseded() {
      const error = new Error('Drawing preview superseded');
      error.name = 'AbortError';
      return error;
    }

    function supersedePreviews() {
      clearTimeout(timer);
      timer = null;
      pending?.reject(superseded());
      pending = null;
      if (active?.preview) active.reject(superseded());
    }

    function dispatch() {
      if (active || failure) return;
      if (exports.length) active = exports.shift();
      else if (pending && !timer) {
        active = pending;
        pending = null;
      }
      if (!active) return;
      try {
        worker.postMessage(active.message);
      } catch (error) {
        const job = active;
        active = null;
        job.reject(error);
        dispatch();
      }
    }

    function request(message, {preview = false, delay = 0} = {}) {
      return new Promise((resolve, reject) => {
        if (failure) {
          reject(failure);
          return;
        }
        const job = {message: {...structuredClone(message), request: ++requestId}, preview, resolve, reject};
        if (preview) {
          supersedePreviews();
          pending = job;
          if (delay > 0) {
            timer = setTimeout(() => {
              timer = null;
              dispatch();
            }, delay);
          }
        } else {
          exports.push(job);
        }
        dispatch();
      });
    }

    worker.onmessage = ({data}) => {
      if (!active || data.request !== active.message.request) return;
      const job = active;
      active = null;
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.result);
      dispatch();
    };
    worker.onerror = event => {
      failure = new Error(event.message || 'Drawing worker failed');
      clearTimeout(timer);
      for (const job of [active, pending, ...exports]) job?.reject(failure);
      active = null;
      pending = null;
      exports.length = 0;
    };

    return {request};
  }
  root.DrawingRenderQueue = {create};
})(globalThis);
