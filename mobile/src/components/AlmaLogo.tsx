import { Image, type ImageProps } from 'react-native';

// RN 0.86's Android native/Flow Image supports this quality option, but its
// bundled TypeScript ImageProps omits it. Decode at 2x the target, then scale down.
const androidResize: ImageProps & { resizeMultiplier: number } = { resizeMethod: 'resize', resizeMultiplier: 2 };

export function AlmaLogo() {
  return <Image source={require('../../assets/branding/la-teacher-alma-logo.png')} resizeMode="contain"
    {...androidResize}
    accessibilityLabel="La Teacher Alma" style={{ height: 44, aspectRatio: 3178 / 2352, marginBottom: 6 }} />;
}
