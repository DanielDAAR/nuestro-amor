/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#fefcf5',
        paperDark: '#f5f0e1',
        tape: 'rgba(255,255,255,0.7)',
        ink: '#2d2d2d',
        inkLight: '#5a5a5a',
        heart: '#e85d75',
        heartSoft: '#fce8ec',
        accent: {
          1: '#ff6b9d',
          2: '#ffa8c8',
          3: '#ffd6e8',
          4: '#c8f0ff',
          5: '#b8e0ff',
        },
      },
      fontFamily: {
        handwriting: ['"Nothing You Could Do"', 'cursive'],
        handwritingBold: ['"Caveat"', 'cursive'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Outfit"', 'sans-serif'],
      },
      boxShadow: {
        paper: '0 4px 20px -4px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.04)',
        paperLift: '0 12px 40px -8px rgba(0,0,0,0.12), 0 4px 12px -4px rgba(0,0,0,0.06)',
        tape: '0 1px 3px rgba(0,0,0,0.1)',
      },
      rotate: {
        'random-1': '-3deg',
        'random-2': '2deg',
        'random-3': '-1.5deg',
        'random-4': '1deg',
        'random-5': '-2.5deg',
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg\")",
        'tape-texture': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,0 L100,0 L95,20 L5,20 Z' fill='rgba(255,255,255,0.6)'/%3E%3Cpath d='M0,0 L100,0 L95,20 L5,20 Z' fill='none' stroke='rgba(0,0,0,0.05)' stroke-width='0.5'/%3E%3C/svg\")",
      },
    },
  },
  plugins: [],
}