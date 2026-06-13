import React from 'react';
import {
  AbsoluteFill,
  Composition,
  useCurrentFrame,
  spring,
} from 'remotion';

const AUDIENCES = [
  'Students',
  'Teachers',
  'Professionals',
  'Creators',
  'Developers',
  'Marketers',
  'Businesses',
];

const DURATION_PER_AUDIENCE = 80; // frames: typing + pause + deleting

export const AudienceComp: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;

  const total = AUDIENCES.length * DURATION_PER_AUDIENCE;
  const loopFrame = frame % total;
  const currentIndex = Math.floor(loopFrame / DURATION_PER_AUDIENCE);
  const local = loopFrame % DURATION_PER_AUDIENCE;

  // typing window: 0..(typeEnd-1), pause: typeEnd..pauseEnd, delete: pauseEnd..end
  const typeEnd = 30; // frames used to type
  const pauseEnd = 52; // pause after full word

  const audience = AUDIENCES[currentIndex] ?? '';

  let visible = '';
  if (local < typeEnd) {
    const chars = Math.floor((local / (typeEnd - 1)) * audience.length + 0.001);
    visible = audience.slice(0, chars);
  } else if (local < pauseEnd) {
    visible = audience;
  } else {
    // deleting
    const delLocal = local - pauseEnd;
    const delFrames = DURATION_PER_AUDIENCE - pauseEnd;
    const charsLeft = Math.max(0, Math.ceil(audience.length * (1 - delLocal / delFrames)));
    visible = audience.slice(0, charsLeft);
  }

  const scale = 1 + spring({frame: Math.min(local, 12), fps, config: {damping: 12}}) * 0.06;

  return (
    <AbsoluteFill style={{background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 36, opacity: 0.9, marginBottom: 28}}>Everything You Need. Nothing You Don't.</div>
        <div style={{height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{transform: `scale(${scale})`, transition: 'transform 120ms'}}>
            <span style={{fontSize: 88, fontWeight: 800, letterSpacing: -1}}>{visible}</span>
            <span style={{display: 'inline-block', width: 18}} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default function VideoRoot() {
  return (
    <>
      <Composition
        id="Audience"
        component={AudienceComp}
        durationInFrames={AUDIENCES.length * DURATION_PER_AUDIENCE}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
}
