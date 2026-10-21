/* beats.js — the only topic file of a V5 comic film.
 *
 * window.Beats(api) is called once, after the world is built; render(t) is called every frame (pure function of t).
 * The starter performs every narration line with a draft beat: api.placeholder(line) = the line's comic panel with its
 * beat note (story.notes), its key phrase lettered word by word in a shout balloon, its real terms slammed as
 * stickers, a halftone timing strip and a small 「待演绎」 tag. Replace a line's placeholder with the performed beat
 * (see STARTER.md: the api, the station / panel layout, and idioms from the KV cache film), and list that line in
 * PERFORMED in tools/sfx.py so its draft sounds are dropped.
 */
window.Beats = function (api) {
  "use strict";
  var S = api.story, K = api.Kit, C = api.C; // the names STARTER.md's idioms use
  var beats = S.lines
    .filter(function (L) { return !S.end || L.i !== S.end.line; }) // the closing line is Kit.title's (closing station)
    .map(function (L) { return api.placeholder(L.i); });

  return {
    render: function (t) {
      for (var i = 0; i < beats.length; i++) beats[i].render(t);
    },
  };
};
