/* beats.js — THE topic file of a V11 casefile 「案卷」 film. Everything else (the cork board, one station per chapter,
 * the tape timeline under each station, the red string carried from station to station, the camera, chip, label-maker
 * captions, the closing line typed on a sheet pinned over the pulled-back board, the case-folder recap, the sound) is
 * driven by the story; this file performs it.
 *
 * window.Beats(api) is called once after the board is built; return { render(t) } — called every frame with the film
 * time t (a pure function of t: no clocks, no randomness). Every beat time comes from the story:
 *   api.at(line, unit) · api.phrase(line, text) · api.span(line, text) · api.story.line(i).start / .end
 * Things built with api.card / pin / string / stamp / typed / hand / mark / note / … render themselves; render(t) is
 * for anything else. api.keys[i] = "phrase" picks the yellow span of line i's caption (null: none).
 *
 * This starter version draws a draft: one index card per narration line in its chapter's station (the beat note from
 * story.notes — or the line's key phrase — typed on as the line is spoken, a small blue 「待演绎」 stamp), red string from
 * card to card, and the camera leans toward each new card. Replace them chapter by chapter with performed scenes —
 * see STARTER.md.
 */
window.Beats = function (api) {
  "use strict";
  const story = api.story;

  // per narration line (the closing line is typed on the board by Kit.title): a draft card in its chapter's station
  story.lines.forEach((L) => {
    if (!api.isEnd(L.i)) api.placeholder(L.i);
  });

  return {
    render(t) {},
  };
};
