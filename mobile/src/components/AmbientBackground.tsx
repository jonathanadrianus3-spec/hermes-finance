import React from 'react';
import { View, StyleSheet } from 'react-native';

export const AmbientBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Background ambient glowing light orbs matching Android 17 wallpaper */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbCenterLeft} />
      <View style={styles.orbBottomRight} />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090614',
  },
  orbTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(147, 51, 234, 0.22)', // Soft purple glow
  },
  orbCenterLeft: {
    position: 'absolute',
    top: 260,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99, 102, 241, 0.16)', // Ambient indigo aura
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: 40,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(192, 132, 252, 0.18)', // Lavender backlight
  },
});
