import { Image, View } from 'react-native';

// Metro selects an offline Lanczos derivative for the device density.
// Official PDF horizontal composition: 148x31dp (~287 KiB decoded at 4x).
// Existing flag remains 60x44dp (~165 KiB at 4x); neither source is redrawn.
export function AlmaLogo({ compact = false, horizontal = false, horizontalWidth = 148, trimHorizontal = false }: { compact?: boolean; horizontal?: boolean; horizontalWidth?: number; trimHorizontal?: boolean } = {}) {
  // Measured alpha bounds in the official @4x asset: (17,21)..(575,106), 592x124.
  // Crop only transparent margins; scale both axes equally, keeping the original asset.
  if (horizontal && trimHorizontal) return <View style={{ width: horizontalWidth, height: horizontalWidth * 86 / 559, overflow: 'hidden' }}>
    <Image source={require('../../assets/branding/la-teacher-alma-horizontal.png')} resizeMode="contain" resizeMethod="none" fadeDuration={0}
      accessibilityLabel="La Teacher Alma" style={{ width: horizontalWidth * 592 / 559, height: horizontalWidth * 124 / 559,
        marginLeft: -horizontalWidth * 17 / 559, marginTop: -horizontalWidth * 21 / 559 }} />
  </View>;
  if (horizontal) return <Image source={require('../../assets/branding/la-teacher-alma-horizontal.png')}
    resizeMode="contain" resizeMethod="none" fadeDuration={0}
    accessibilityLabel="La Teacher Alma" style={{ width: horizontalWidth, height: horizontalWidth * 31 / 148 }} />;
  return <Image source={require('../../assets/branding/la-teacher-alma-mobile.png')}
    resizeMode="contain" resizeMethod="none" fadeDuration={0}
    accessibilityLabel="La Teacher Alma" style={compact ? { height: 40, width: 54 } : { height: 44, width: 60, marginBottom: 6 }} />;
}
