import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, Path } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

export default function WavyBackground() {
  const { isDarkMode } = useTheme();
  const { width, height } = useWindowDimensions();

  // Light mode: white/light grays; Dark mode: dark grays/charcoal
  const colors = isDarkMode
    ? {
        bg: '#0A0A0A',
        wave1: '#1A1A1A',
        wave2: '#252525',
        wave3: '#303030',
      }
    : {
        bg: '#FFFFFF',
        wave1: '#F5F5F5',
        wave2: '#E8E8E8',
        wave3: '#D8D8D8',
      };

  const svgHeight = height * 1.2;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${width} ${svgHeight}`}
        preserveAspectRatio="xMidYMid slice"
        style={styles.svg}
      >
        <Defs />

        {/* Top curved shape */}
        <Path
          d={`M 0 0 Q ${width * 0.3} ${height * 0.15} ${width} 0 L ${width} ${height * 0.5} Q ${width * 0.7} ${height * 0.35} 0 ${height * 0.45} Z`}
          fill={colors.wave1}
          opacity="0.4"
        />

        {/* Bottom layered waves */}
        <Path
          d={`M 0 ${height * 0.65} Q ${width * 0.25} ${height * 0.75} ${width * 0.5} ${height * 0.7} T ${width} ${height * 0.65} L ${width} ${svgHeight} L 0 ${svgHeight} Z`}
          fill={colors.wave2}
          opacity="0.6"
        />

        <Path
          d={`M 0 ${height * 0.8} Q ${width * 0.3} ${height * 0.88} ${width * 0.5} ${height * 0.85} T ${width} ${height * 0.8} L ${width} ${svgHeight} L 0 ${svgHeight} Z`}
          fill={colors.wave3}
          opacity="0.8"
        />

        {/* Additional subtle wave at the very bottom */}
        <Path
          d={`M 0 ${height * 0.92} Q ${width * 0.25} ${height * 0.96} ${width * 0.5} ${height * 0.94} T ${width} ${height * 0.92} L ${width} ${svgHeight} L 0 ${svgHeight} Z`}
          fill={colors.wave3}
          opacity="0.5"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
