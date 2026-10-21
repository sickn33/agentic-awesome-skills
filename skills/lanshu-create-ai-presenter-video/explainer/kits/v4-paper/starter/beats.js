/* beats.js — the only topic file of a v4-paper film (纸艺立体书).
 *
 * The driver in index.html builds the book page, one station per chapter, the camera, the chrome (chip, captions,
 * closing ribbons, recap) and then calls window.Beats(api) once; the object you return is rendered every frame with
 * render(t). Every beat time must come from the story (api.at / api.ph / story.span …) plus small offsets.
 *
 * This starter version performs nothing yet: every narration line (except the closing line, which Kit.title prints)
 * gets an on-style draft beat — api.placeholder(line), a pop-up storyboard card marked 「待演绎」. Replace them line by
 * line with performed scenes (see kits/v4-paper/starter/STARTER.md for the api and the paper idioms).
 */
window.Beats = function (api) {
  "use strict";
  var story = api.story;
  var endLine = story.end ? story.end.line : null;

  // ---------- draft beats: one storyboard card per narration line ----------
  var beats = story.lines
    .filter(function (L) { return L.i !== endLine; })
    .map(function (L) { return api.placeholder(L.i); });

  // ---------- performed beats go here, e.g. (see STARTER.md):
  // var S = api.station(0), sp = api.spot(1);
  // var board = api.el("div", "a kit-sandp"); api.box(board, sp.x - 400, api.FLOOR - 360, 800, 360);
  // var boardSh = api.shadowFor(sp.x - 400, 800, 110);
  // beats.push({ render: function (t) { api.standUp(board, boardSh, t, api.ph(1, "某个词"), 0.5); } });

  return {
    render: function (t) {
      for (var i = 0; i < beats.length; i++) beats[i].render(t);
    },
  };
};
