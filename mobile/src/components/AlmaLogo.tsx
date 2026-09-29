import { Image } from 'react-native';

export function AlmaLogo() {
  return <Image source={require('../../assets/branding/la-teacher-alma-logo.png')} resizeMode="contain"
    accessibilityLabel="La Teacher Alma" style={{ height: 44, aspectRatio: 3178 / 2352, marginBottom: 6 }} />;
}
