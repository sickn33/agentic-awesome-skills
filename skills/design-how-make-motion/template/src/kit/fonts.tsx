import {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {alias, type Face, type VideoTheme} from './theme';

// Loads the theme's faces before the first frame, so no frame is drawn, or measured, in a fallback font.
//
// Every face registers under an alias ("Geist (video)"), never its own family name. A copy of the same family
// installed on the machine then can't satisfy the load or stand in for it at render time (a proof run lost an hour
// to Geist in ~/Library/Fonts). And `document.fonts.check(spec)` alone proves nothing: it returns true for a family
// no @font-face declares. `loaded(family)` asks whether a FontFace of that family actually loaded.

export const loaded = (family: string) => [...document.fonts].some(f => f.family.replace(/["']/g, '') === family && f.status === 'loaded');

async function loadFace(f: Face) {
  const name = alias(f);
  if (f.src?.file) {
    // One variable file covers every weight; static files each carry their own weight.
    const files = typeof f.src.file === 'string' ? [{file: f.src.file, weight: 0}] : f.src.file;
    for (const {file, weight} of files) {
      const face = new FontFace(name, `url("${staticFile(file)}")`, {weight: weight ? String(weight) : '100 900', display: 'block'});
      document.fonts.add(await face.load());
    }
  } else if (f.src?.google) {
    // Google's CSS declares one @font-face per weight and subset. Rename the family to the alias, add it to the page,
    // then load each weight.
    if (!document.querySelector(`style[data-font="${name}"]`)) {
      const css = await fetch(f.src.google).then(r => {
        if (!r.ok) throw new Error(`${f.src!.google} answered ${r.status}`);
        return r.text();
      });
      const style = document.createElement('style');
      style.dataset.font = name;
      style.textContent = css.replace(/font-family:\s*['"]?[^;'"]+['"]?;/g, `font-family: "${name}";`);
      document.head.append(style);
    }
    await Promise.all([400, 500, 600, f.weight ?? 400].map(w => document.fonts.load(`${w} 32px "${name}"`)));
  } else {
    return; // a system face: nothing to load
  }
  if (!loaded(name)) throw new Error(`The font "${f.family}" did not load`);
}

export function useThemeFonts(theme: VideoTheme) {
  const [handle] = useState(() => delayRender('Loading the theme fonts', {timeoutInMilliseconds: 60000}));
  useEffect(() => {
    const faces = [theme.font.display, theme.font.text, theme.font.mono];
    const unique = faces.filter((f, i) => faces.findIndex(g => g.family === f.family) === i);
    Promise.all(unique.map(loadFace))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle), (e: Error) => {
        // Fail the render at once, loudly, rather than draw a frame in the fallback or wait out the timeout.
        cancelRender(e);
      });
  }, [handle, theme]);
}
