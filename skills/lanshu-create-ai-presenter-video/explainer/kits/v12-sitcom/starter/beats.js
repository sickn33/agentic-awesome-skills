/* beats.js — the only topic file of a v12-sitcom film (小剧场).
 *
 * The driver in index.html builds the set (one room per chapter, side by side), the camera, the chrome (小剧场 chip,
 * captions with the 旁白 tag, the closing line, the curtain-call recap) and then calls window.Beats(api) once; the object
 * you return is rendered every frame with render(t). Every beat time must come from the story (api.at / api.ph /
 * api.span …) plus small offsets.
 *
 * This starter version performs nothing yet: every narration line (except the closing line, which Kit.title performs)
 * gets an on-style draft beat — api.placeholder(line): one of the set's two stand-ins says the beat note in a speech
 * bubble, lit as the voice speaks, marked 「待演绎」. Replace them line by line with performed scenes (see
 * kits/v12-sitcom/starter/STARTER.md for the api and the sitcom idioms).
 */
window.Beats = function (api) {
  "use strict";
  var story = api.story;
  var endLine = story.end ? story.end.line : null;

  // ---------- draft beats: one storyboard bubble per narration line ----------
  var beats = story.lines
    .filter(function (L) { return L.i !== endLine; })
    .map(function (L) { return api.placeholder(L.i); });

  // ---------- performed beats go here, e.g. (see STARTER.md):
  // var S = api.station(0);
  // S.dress.style.display = "none";                                   // redress the set yourself
  // var lin = api.actor({ x: S.cx + 300, y: api.FEET, hair: "short", shirt: "#fff", apron: "#5fb88f", name: "小林 · 新店员" });
  // lin.cue(api.ph(2, "手太慢"), { face: "worried", arms: ["front", "front"], sweat: true });
  // beats.push({ render: function (t) { lin.render(t); } });

  return {
    render: function (t) {
      for (var i = 0; i < beats.length; i++) beats[i].render(t);
    },
  };
};
