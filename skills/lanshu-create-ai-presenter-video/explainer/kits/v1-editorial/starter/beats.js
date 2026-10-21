/* beats.js — THE topic file of a V1 editorial 「留白」 film. Everything else (world, camera, chip, captions,
 * closing line, recap, sound) is driven by the story; this file performs it.
 *
 * window.Beats(api) is called once after the world is built; return { render(t) } — called every frame with the
 * film time t (a pure function of t: no clocks, no randomness). Every beat time comes from the story:
 *   const S = api.story;  S.at(line, unit) · S.phrase(line, text) · S.span(line, text) · S.line(i).start/.end
 *
 * This starter version draws a draft: one placeholder beat per narration line (its beat note or key phrase, the
 * Latin terms pinned to a timing strip, a 「待演绎」 tag), a draft standfirst per chapter, and a dashed figure
 * card on the closing page. Replace them chapter by chapter with performed scenes — see STARTER.md.
 */
window.Beats = function (api) {
  "use strict";
  const S = api.story;
  const parts = [];

  // per chapter: the standfirst slot under the chip (replace with one plain-language 「说明」 line: api.note(text, at, out))
  S.chapters.forEach((c, k) => api.placeholderChapter(k));

  // per narration line (the closing line is performed by Kit.title): a draft beat in its chapter's page
  S.lines.forEach((L) => {
    if (S.end && L.i === S.end.line) return;
    parts.push(api.placeholder(L.i));
  });

  // the closing page: a figure slot next to the closing line (replace with the film's closing figure)
  const endFig = api.placeholderEnd();
  if (endFig) parts.push(endFig);

  // the recap figure (optional): api.recapFigure(el, [w, h]) — a miniature of the film's hero, see STARTER.md

  return {
    render(t) {
      for (const p of parts) p.render(t);
    },
  };
};
