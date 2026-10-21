/* beats.js — the only topic file of a V2 signal film.
 *
 * window.Beats(api) is called once, after the driver has built the world (one station per chapter), the chrome
 * (HUD, chapter chip, captions, closing title, recap) and before the camera keys are fixed. Return { render(t) };
 * the driver calls it every frame. Everything you build lives in api.station(k) (or api.closing) and is a pure
 * function of t. Beat times come from api.story (story.at / phrase / span) + small offsets, never hard-coded.
 *
 * The starter version below gives every narration line an on-style draft beat (a storyboard frame with the beat note,
 * the terms, the line written on as it is spoken and its signal trace, tagged 待演绎). Replace them chapter by chapter
 * with performed scenes — see STARTER.md for the api and the idioms (decode-in labels, count-ups, packets on wires,
 * trackers, camera shots).
 */
window.Beats = function (api) {
  "use strict";

  // one draft beat per narration line (the closing line is performed by Kit.title in the driver)
  const drafts = api.lines.map((L) => api.placeholder(L));

  // the chapters light up in a chain under the closing line (delete for your own closing performance)
  const chain = api.closingChain();

  return {
    render(t) {
      drafts.forEach((d) => d.render(t));
      if (chain) chain.render(t);
    },
  };
};
