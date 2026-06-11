import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Reproduces the web `.page-dark-shell` background:
//   linear-gradient(180deg, #061b2d, #071827 46%, #05111f)
//   radial-gradient(circle at 10% -8%, rgba(249,115,22,0.20), transparent 28rem)
//   radial-gradient(circle at 86% 3%,  rgba(56,189,248,0.14), transparent 30rem)
//
// The radial glows are faked with many dense concentric circles of low opacity
// (alpha compounds toward the centre -> smooth falloff). Pure RN, works on web.

type Layer = { d: number; o: number };

// Build `count` concentric circles from `maxD` down to ~8%, each at `opacity`.
function buildGlow(maxD: number, count: number, opacity: number): Layer[] {
  const out: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const d = maxD * (1 - (i / count) * 0.92);
    out.push({ d, o: opacity });
  }
  return out;
}

function Glow({ color, cx, cy, layers }: { color: string; cx: number; cy: number; layers: Layer[] }) {
  return (
    <>
      {layers.map((l, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: cx - l.d / 2,
            top: cy - l.d / 2,
            width: l.d,
            height: l.d,
            borderRadius: l.d / 2,
            backgroundColor: color,
            opacity: l.o,
          }}
        />
      ))}
    </>
  );
}

export function ScreenBackground() {
  const { width } = useWindowDimensions();

  // 28rem / 30rem ≈ 448 / 480 px radius -> ~900 / 960 px diameter
  const orange = buildGlow(900, 16, 0.018);
  const blue = buildGlow(960, 14, 0.012);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <LinearGradient
        colors={['#061b2d', '#071827', '#05111f']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Glow color="#F97316" cx={width * 0.1} cy={width * -0.08} layers={orange} />
      <Glow color="#38bdf8" cx={width * 0.86} cy={width * 0.03} layers={blue} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#05111f' },
});
