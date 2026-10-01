import { Image } from 'react-native';

// Metro selects an offline Lanczos derivative for the device density.
// Official PDF horizontal composition: 124x26dp (~202 KiB decoded at 4x).
// Existing flag remains 60x44dp (~165 KiB at 4x); neither source is redrawn.
export function AlmaLogo({ compact = false, horizontal = false }: { compact?: boolean; horizontal?: boolean } = {}) {
  if (horizontal) return <Image source={require('../../assets/branding/la-teacher-alma-horizontal.png')}
    resizeMode="contain" resizeMethod="none" fadeDuration={0}
    accessibilityLabel="La Teacher Alma" style={{ width: 124, height: 26 }} />;
  return <Image source={require('../../assets/branding/la-teacher-alma-mobile.png')}
    resizeMode="contain" resizeMethod="none" fadeDuration={0}
    accessibilityLabel="La Teacher Alma" style={compact ? { height: 40, width: 54 } : { height: 44, width: 60, marginBottom: 6 }} />;
}
