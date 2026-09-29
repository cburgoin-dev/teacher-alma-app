import { Image } from 'react-native';

// Preserve the official raster through decode. On Android, 'none' disables
// Fresco downsampling as well as ResizeOptions; 'scale' alone does not.
// The single cached 3178x2352 RGBA bitmap costs ~28.5 MiB. No upscaling.
export function AlmaLogo() {
  return <Image source={require('../../assets/branding/la-teacher-alma-logo.png')}
    resizeMode="contain" resizeMethod="none" fadeDuration={0}
    accessibilityLabel="La Teacher Alma" style={{ height: 44, aspectRatio: 3178 / 2352, marginBottom: 6 }} />;
}
