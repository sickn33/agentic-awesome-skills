/* beats.js — THE topic file of a V3 notebook 「手帐」 film. Everything else (the page, one station per chapter, the pen,
 * the camera, chip, captions, the closing line written on the page, the turned-page recap, the sound) is driven by
 * the story; this file performs it.
 *
 * window.Beats(api) is called once after the page is built; return { render(t) } — called every frame with the film
 * time t (a pure function of t: no clocks, no randomness). Every beat time comes from the story:
 *   api.at(line, unit) · api.phrase(line, text) · api.span(line, text) · api.story.line(i).start / .end
 * Things built with api.write / api.draw / api.note / api.add render themselves; render(t) is for anything else.
 * Optional: return { render, closingWash: false } to keep the storyboard un-dimmed under the closing line.
 *
 * This starter version draws a draft: one storyboard card per narration line in its chapter's station (the beat note
 * from story.notes, or the line's key phrase, written by the pen as the line is spoken, a 「待演绎」 tab), and the camera
 * follows the cards. Replace them chapter by chapter with performed scenes — see STARTER.md.
 */
window.Beats = function (api) {
  "use strict";
  const story = api.story;

  // per narration line (the closing line is written on the page by Kit.title): a draft card in its chapter's station
  story.lines.forEach((L) => {
    if (!api.isEnd(L.i)) api.placeholder(L.i);
  });

  return {
    render(t) {},
  };
};
