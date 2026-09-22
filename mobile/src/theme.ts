import { StyleSheet } from 'react-native';

export const colors = {
  ink: '#101B4D', muted: '#61759D', blue: '#0062E9', pale: '#EFF6FF',
  border: '#DFEAF8', red: '#F52A46', gold: '#84550C', goldLight: '#FFF0D0',
  gray: '#8297B5', white: '#FFFFFF',
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const radius = { card: 18, hero: 20, pill: 999 };
export const type = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 33, fontWeight: '800', color: colors.ink, letterSpacing: -.7 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted },
  caption: { fontSize: 12, lineHeight: 17, color: colors.muted },
});
export const shadows = StyleSheet.create({
  card: { shadowColor: '#315A92', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .07, shadowRadius: 9, elevation: 2 },
  node: { shadowColor: '#315A92', shadowOffset: { width: 0, height: 5 }, shadowOpacity: .17, shadowRadius: 8, elevation: 4 },
});
