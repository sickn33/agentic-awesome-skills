/* beats.js — the only topic file of a v9-clay film.
 *
 * The driver (index.html) builds the clay town from the story — one plot per chapter, streets, a plaza, the camera,
 * captions, chapter chip, closing line and recap — then calls window.Beats(api) once and beats.render(t) every frame.
 * This starter version performs nothing yet: every narration line gets a draft beat (api.placeholder): its key phrase
 * set in clay movable type on the line's row of its chapter's plot, landing unit by unit as it is spoken, under a
 * storyboard slip with the beat note (story.notes) and a 「待演绎」 tag.
 *
 * To perform a line, drop it from DRAFT, build its props once (in api.station(k).group or the scene) with the times
 * from api.story (story.at / story.phrase / story.span), and animate them in render(t) as a pure function of t.
 * See kits/v9-clay/starter/STARTER.md for the api and idioms.
 */
window.Beats = function (api) {
  const { story } = api;
  const END = story.end ? story.end.line : null;

  // lines still in draft: every narration line except the closing one (Kit.title performs that)
  const DRAFT = story.lines.filter((L) => L.i !== END).map((L) => L.i);
  const beats = DRAFT.map((i) => api.placeholder(i));

  return {
    render(t) {
      for (const b of beats) b.render(t);
    },
  };
};
