import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Image as SvgImage } from 'react-native-svg';
import { courseCoverSource } from '../../courses/components/CourseCover';
import { courseArtworkFrame } from '../artwork';

/** Shared crop for Home surfaces. Preserve local art while a remote cover loads/fails. */
export function HomeCourseArtwork({ uri, level, box, clipPath }: {
  uri: string | null; level: string | null;
  box: { x: number; y: number; width: number; height: number }; clipPath?: string;
}) {
  const [remote, setRemote] = useState<{ uri: string; ratio: number } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let current = true;
    Image.getSize(uri, (width, height) => {
      if (current && width > 0 && height > 0) setRemote({ uri, ratio: width / height });
    }, () => { if (current) setRemote(null); });
    return () => { current = false; };
  }, [uri]);
  const loaded = remote?.uri === uri ? remote : null;
  const frame = courseArtworkFrame(level, box, loaded?.ratio ?? 1.5, !loaded);
  return <SvgImage href={courseCoverSource(loaded?.uri ?? null, level)} {...frame}
    preserveAspectRatio="xMidYMid meet" clipPath={clipPath} />;
}
