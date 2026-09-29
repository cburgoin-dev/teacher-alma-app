import { Image } from 'react-native';

export function AlmaLogo() {
  return <Image source={require('../../assets/branding/la-teacher-alma-logo.png')} resizeMode="contain"
    accessibilityLabel="La Teacher Alma" style={{ width: 116, height: 86, marginBottom: 10 }} />;
}
