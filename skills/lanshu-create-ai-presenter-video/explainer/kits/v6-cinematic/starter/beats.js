/* beats.js — the only topic file of a V6 cinematic film.
 *
 * window.Beats(api) is called once, after the studio and the stations exist (fonts are loaded, so canvas text
 * can be drawn right away); its render(t) runs every frame, after the camera is set and before the overlay is
 * placed. Every beat time comes from the story (story.at / story.phrase / story.span / story.line(i).start).
 *
 * The starter version draws a placeholder for every narration line (the closing line belongs to Kit.title).
 * To perform a line: build its scene here, take its number out of DRAFT, and render it in render(t).
 * The api is documented in kits/v6-cinematic/starter/STARTER.md.
 */
window.Beats = function (api) {
  const { story } = api;
  const endLine = story.end ? story.end.line : null;

  // lines still drafted as placeholders (remove a line number once its scene exists)
  const DRAFT = story.lines.map((L) => L.i).filter((i) => i !== endLine);
  const drafts = DRAFT.map((i) => api.placeholder(i));

  return {
    render(t) {
      for (const d of drafts) d.render(t);
    },
  };
};
