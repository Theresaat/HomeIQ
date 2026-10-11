export const palette = {
  blue: '#164BFA', blueSoft: '#EDF2FF', ink: '#101A39', muted: '#65728D',
  background: '#F8FAFD', white: '#FFFFFF', border: '#EAF0F6',
  green: '#009C70', greenSoft: '#E7FAF2', orange: '#B66B00', orangeSoft: '#FFF3D6',
  red: '#D92D43', redSoft: '#FFF0F2',
} as const;
export type Tone = 'blue' | 'green' | 'orange' | 'red';
export const toneBackground = { blue: palette.blueSoft, green: palette.greenSoft, orange: palette.orangeSoft, red: palette.redSoft };
