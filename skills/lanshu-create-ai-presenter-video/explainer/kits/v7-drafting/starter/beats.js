/* beats.js — the only topic file of a V7 · 图纸与注脚 film.
 *
 * The driver in index.html has already built the sheet from window.STORY: one figure per 1–2 narration lines (a chapter
 * always starts a new figure), every line's ghost-letter headline (this style's caption), the crane camera, the leaders
 * between figures, the chapter chip, the closing line and the recap. It calls window.Beats(api) once, then render(t)
 * every frame.
 *
 * This starter version draws a placeholder for every narration line (except the closing line): a construction-line
 * hold box tagged 「待演绎」 with the line's beat note, its phrases inked on the line's own time axis, and a playhead.
 * Replace them one line at a time with performed scenes — see kits/v7-drafting/starter/STARTER.md for the api and the
 * idioms (parts that pop at their word, typed labels, count-ups, a revision cloud, leaning the camera to a sub-spot).
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
