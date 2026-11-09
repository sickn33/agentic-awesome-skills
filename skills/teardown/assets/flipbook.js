(function (root) {
  function create(spawn, {frames = 85, size = 4, ease = t => t} = {}) {
    const workers = [];
    let job = null, nextRequest = 0;

    function renderOn(worker, message) {
      return new Promise((resolve, reject) => {
        const request = ++nextRequest;
        const onMessage = ({data}) => {
          if (data.request !== request) return;
          worker.removeEventListener('message', onMessage);
          if (data.error) reject(new Error(data.error));
          else resolve(data.result.markup);
        };
        worker.addEventListener('message', onMessage);
        worker.postMessage({...message, request});
      });
    }

    function prepare(key, message) {
      if (job?.key === key) return;
      if (job) job.cancelled = true;
      while (workers.length < size) workers.push(spawn());
      const current = {key, frames: null, cancelled: false}, rendered = [];
      let next = 0;
      job = current;
      // Only the end frames carry labels: playback hides them, and frames that
      // still hold them cost enough to drop refreshes.
      Promise.all(workers.map(async worker => {
        while (next < frames && !current.cancelled) {
          const i = next++;
          rendered[i] = await renderOn(worker, {...message, explosion: ease(i / (frames - 1)), fitExplosion: 1, labels: i === 0 || i === frames - 1});
        }
      })).then(() => {
        if (!current.cancelled) current.frames = rendered;
      }, () => {
        if (job === current) job = null;
      });
    }

    const ready = key => (job?.key === key && job.frames) || null;

    return {prepare, ready};
  }

  // cubic-bezier(.65, 0, .35, 1): slow at both ends, so parts ease apart.
  const easeInOutCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

  root.DrawingFlipbook = {create, easeInOutCubic};
})(globalThis);
