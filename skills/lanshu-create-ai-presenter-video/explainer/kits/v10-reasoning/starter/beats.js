/* beats.js — the only topic file of a V10 · 推演 film.
 *
 * The driver in index.html has already built the canvas from window.STORY: one derivation station per chapter (a
 * 1920×1080 region of one infinite dot-grid canvas, laid out as a snake grid), the chapter's statement at the top of
 * each station, a slot per narration line, ⇒ arrows between stations, the glide camera, captions, the chapter chip, the
 * closing statement and the recap. It calls window.Beats(api) once, then render(t) every frame.
 *
 * This starter version draws a placeholder for every narration line (except the closing line): a derivation step —
 * its number, the beat note written as the line starts, a construction axis over the line's own time with a dot per
 * phrase, the phrases lit as they are spoken — tagged 「待演绎」. Replace them one line at a time with the derivation
 * itself: geometry that is built step by step as it is spoken (kits/v10-reasoning/starter/STARTER.md has the api and
 * the idioms: a colour-bound formula with leaders, a dot triangle that grows row by row, vectors on a plane, a plot).
 */
window.Beats = function (api) {
  "use strict";
  const { story } = api;
  const endLine = story.end ? story.end.line : null;
  const P = story.lines.filter((L) => L.i !== endLine).map((L) => api.placeholder(L.i));
  return {
    render(t) {
      for (const p of P) p.render(t);
    },
  };
};
