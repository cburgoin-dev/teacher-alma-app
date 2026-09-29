import { Image } from 'react-native';

// Metro selects an offline Lanczos derivative for the device density.
// Original mark/proportions preserved in a transparent 60x44dp canvas.
// At 4x the decoded bitmap is ~165 KiB instead of ~28.5 MiB.
export function AlmaLogo() {
  return <Image source={require('../../assets/branding/la-teacher-alma-mobile.png')}
    resizeMode="contain" resizeMethod="none" fadeDuration={0}
    accessibilityLabel="La Teacher Alma" style={{ height: 44, width: 60, marginBottom: 6 }} />;
}
