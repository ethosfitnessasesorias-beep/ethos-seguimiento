// ETHOS GYM design tokens — black / red / Montserrat system.
export const colors = {
  bg: '#080808',
  surface1: '#111111',
  surface2: '#1A1A1A',
  text: '#F5F5F5',
  accent: '#db1809',
  accentHover: '#f0331f',
  // status / category accents
  green: '#4ade80',
  amber: '#f5a623',
  teal: '#2dd4bf',
  purple: '#a78bfa',
} as const

// Muted text helper (alpha over #F5F5F5).
export const mut = (a: number) => `rgba(245,245,245,${a})`
