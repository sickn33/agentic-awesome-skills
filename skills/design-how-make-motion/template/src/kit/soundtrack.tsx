import {Audio, getStaticFiles, Sequence, staticFile, useVideoConfig} from 'remotion';

// Places a video's rendered music and sound effects (audio/render.mjs writes them to public/<name>/). Before the music
// is rendered the files don't exist and the video is silent, which is what a review cut wants.

export type Cue = {name: string; at: number[]; len?: number};

export function Soundtrack({name, sfx}: {name: string; sfx: Cue[]}) {
  const {fps} = useVideoConfig();
  const files = new Set(getStaticFiles().map(f => f.name));
  const music = `${name}/music.wav`;
  return (
    <>
      {files.has(music) && <Audio name="Music" src={staticFile(music)}/>}
      {sfx.flatMap((cue, i) => {
        const file = `${name}/sfx/${cue.name}.wav`;
        if (!files.has(file)) return [];
        return cue.at.map(at => (
          <Sequence key={`${i}-${at}`} name={`SFX ${cue.name}`} from={at} durationInFrames={cue.len ?? fps} premountFor={fps}>
            <Audio src={staticFile(file)}/>
          </Sequence>
        ));
      })}
    </>
  );
}
