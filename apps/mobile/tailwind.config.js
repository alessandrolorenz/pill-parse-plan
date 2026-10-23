/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#106BC6',
          light: '#2B8CEE',
          dark: '#0C5297',
        },
        secondary: {
          DEFAULT: '#66C628',
        },
        accent: {
          DEFAULT: '#EE9D2B',
        },
        background: '#F9FAFB',
        foreground: '#21262C',
        card: '#FFFFFF',
        muted: {
          DEFAULT: '#F0F2F5',
          foreground: '#627384',
        },
        warning: {
          DEFAULT: '#F47B25',
          bg: '#FFF5E0',
        },
        destructive: '#D92626',
        border: '#DAE0E7',
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
