/* beats.js — the only topic file of a V8 黑板报 film (see STARTER.md).
 *
 * The driver (index.html) has already built the board, one panel ("station") per chapter, and planned where every
 * narration line goes: its chalk headline (the caption, written at the spoken times) and below it a slot for the beat.
 * Beats(api) runs once, before the driver writes the headlines, badges, masthead and recap; render(t) runs every frame
 * after Kit.render(t).
 *
 * This starter version puts an on-style storyboard placeholder (「待演绎」) in every line's slot. Replace a line's
 * placeholder with the performed beat: draw in api.slot(line) with api.S / api.T / api.X / Kit components, timed from
 * api.at(line, unit) / api.phrase(line, text). Keep text strings in this file subset: run tools/fonts.py afterwards.
 */
window.Beats = function (api) {
  var story = api.story;

  story.lines.forEach(function (L) {
    if (api.isEnd(L.i)) return; // the closing line is performed by the masthead (Kit.title)
    api.placeholder(L.i);
  });

  return {
    render: function (t) {},
  };
};
