import {Composition} from 'remotion';
import {EXAMPLE} from './example/video';

// Every video in the project. Add one line per video folder.
const VIDEOS = [EXAMPLE];

export const Root = () => (
  <>
    {VIDEOS.map(v => <Composition key={v.id} {...v}/>)}
  </>
);
