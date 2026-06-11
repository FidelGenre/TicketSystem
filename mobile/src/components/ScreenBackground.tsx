import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Mirrors the web `.page-dark-shell` background using only expo-linear-gradient
// (no native SVG dependency, works on iOS / Android / web):
//   base navy gradient #061b2d -> #071827 -> #05111f
//   orange corner glow top-left  (web: radial 10% -8%, rgba(249,115,22,0.20))
//   blue   corner glow top-right (web: radial 86% 3%,  rgba(56,189,248,0.14))
export function ScreenBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#061b2d', '#071827', '#05111f']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(249,115,22,0.22)', 'rgba(249,115,22,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.78, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.16)', 'rgba(56,189,248,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.22, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
