export const THEME = {
  colors: {
    // Android 17 Deep Cosmic Purple & Liquid Glass
    background: '#090614',          // Deepest obsidian violet
    backgroundSecondary: '#110C24',
    
    // Liquid glass layers with subtle purple tint
    surfaceGlass: 'rgba(29, 21, 51, 0.72)',
    surfaceGlassElevated: 'rgba(42, 31, 74, 0.78)',
    surfaceCard: 'rgba(32, 23, 56, 0.65)',
    surfaceSliderTrack: '#160F2B',
    surfacePill: '#22183D',

    borderGlass: 'rgba(208, 188, 255, 0.16)',
    borderHairline: 'rgba(208, 188, 255, 0.10)',
    borderHighlight: 'rgba(255, 255, 255, 0.20)',

    // Material You Android 17 Purple / Lavender accents
    primary: '#D0BCFF',             // Radiant Lavender Accent
    primaryLight: 'rgba(208, 188, 255, 0.16)',
    primaryGlow: 'rgba(208, 188, 255, 0.35)',
    accentTrack: '#E8DEF8',         // Smooth slider fill
    accentViolet: '#A855F7',
    accentLilac: '#C084FC',

    text: {
      primary: '#F5EEFA',
      secondary: '#B3A6C7',         // Muted lavender gray
      tertiary: '#7F7296',
      muted: '#5A4E70',
    },

    // Status colors tuned to purple harmony
    appleGreen: '#4ADE80',          // Emerald green for successful receipts
    appleOrange: '#FB923C',
    appleRed: '#F87171',
    applePurple: '#C084FC',

    // Entity System in harmonious Android 17 pastel tones
    entities: {
      Personal: {
        color: '#D0BCFF',           // Radiant Lavender
        bg: 'rgba(208, 188, 255, 0.18)',
        border: 'rgba(208, 188, 255, 0.35)',
        icon: 'person',
        label: 'Personal',
      },
      Family: {
        color: '#FFB4AB',           // Soft Peach Blossom
        bg: 'rgba(255, 180, 171, 0.18)',
        border: 'rgba(255, 180, 171, 0.35)',
        icon: 'people',
        label: 'Family',
      },
      Community: {
        color: '#E879F9',           // Electric Orchid
        bg: 'rgba(232, 121, 249, 0.18)',
        border: 'rgba(232, 121, 249, 0.35)',
        icon: 'heart',
        label: 'Community',
      },
      Professional: {
        color: '#A8C7FA',           // Periwinkle Cloud
        bg: 'rgba(168, 199, 250, 0.18)',
        border: 'rgba(168, 199, 250, 0.35)',
        icon: 'briefcase',
        label: 'Professional',
      },
    },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    inset: 18,
  },
  // Android 17 organic squircle radii
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    card: 30,
    pill: 9999,
  },
};
